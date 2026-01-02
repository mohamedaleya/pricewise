import { NextResponse } from 'next/server';

import {
  getLowestPrice,
  getHighestPrice,
  getAveragePrice,
  getEmailNotifType,
} from '@/lib/utils';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/lib/models/product.model';
import { scrapeAmazonProduct } from '@/lib/scraper';
import { generateEmailBody, sendEmail } from '@/lib/nodemailer';

// export const maxDuration = 300;
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET(request: Request) {
  const startTime = Date.now();
  // Only track counts, not URLs or emails (avoids PII in logs/responses)
  const results = {
    successCount: 0,
    failedCount: 0,
    emailsSent: 0,
  };

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== process.env.CRON_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();

    const products = await Product.find({});

    if (!products || products.length === 0) {
      return NextResponse.json({
        message: 'No products to scrape',
        data: results,
      });
    }

    console.log(`[Cron] Starting scrape for ${products.length} products`);

    // ======================== 1 SCRAPE LATEST PRODUCT DETAILS & UPDATE DB
    // Process products sequentially to avoid overwhelming the scraper API
    for (const currentProduct of products) {
      try {
        console.log(
          `[Cron] Scraping: ${currentProduct.title?.substring(0, 50)}...`,
        );

        const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

        if (!scrapedProduct) {
          results.failedCount++;
          continue;
        }

        const updatedPriceHistory = [
          ...currentProduct.priceHistory,
          {
            price: scrapedProduct.currentPrice,
          },
        ];

        const product = {
          ...scrapedProduct,
          priceHistory: updatedPriceHistory,
          lowestPrice: getLowestPrice(updatedPriceHistory),
          highestPrice: getHighestPrice(updatedPriceHistory),
          averagePrice: getAveragePrice(updatedPriceHistory),
        };

        // Update Products in DB
        const updatedProduct = await Product.findOneAndUpdate(
          { url: product.url },
          product,
          { new: true },
        );

        if (!updatedProduct) {
          results.failedCount++;
          continue;
        }

        results.successCount++;

        // ======================== 2 CHECK EACH PRODUCT'S STATUS & SEND EMAIL ACCORDINGLY
        const emailNotifType = getEmailNotifType(
          scrapedProduct,
          currentProduct,
        );

        if (emailNotifType && updatedProduct.users?.length > 0) {
          const productInfo = {
            productId: updatedProduct._id.toString(),
            title: updatedProduct.title,
            url: updatedProduct.url,
            image: updatedProduct.image,
            currentPrice: updatedProduct.currentPrice,
            originalPrice: updatedProduct.originalPrice,
            lowestPrice: updatedProduct.lowestPrice,
            currency: updatedProduct.currency,
            discountRate: updatedProduct.discountRate,
          };

          // Send email to each user individually
          for (const user of updatedProduct.users) {
            try {
              const emailContent = await generateEmailBody(
                productInfo,
                emailNotifType,
                user.email,
              );
              await sendEmail(emailContent, [user.email]);
              results.emailsSent++;
            } catch {
              // Email failed, but continue processing
            }
          }
        }
      } catch (productError: any) {
        results.failedCount++;
        // Continue with next product instead of failing entirely
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[Cron] Completed in ${duration}s - Success: ${results.successCount}, Failed: ${results.failedCount}`,
    );

    return NextResponse.json({
      message: 'Ok',
      duration: `${duration}s`,
      data: results,
    });
  } catch (error: any) {
    console.error('[Cron] Fatal error:', error.message);
    return NextResponse.json(
      {
        message: 'Cron job failed',
        error: error.message,
        data: results,
      },
      { status: 500 },
    );
  }
}
