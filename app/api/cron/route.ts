import { NextResponse } from 'next/server';

import {
  getLowestPrice,
  getHighestPrice,
  getAveragePrice,
  getEmailNotifType,
} from '@/lib/utils';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/lib/models/product.model';
import { scrapeAmazonProduct, closeBrowser } from '@/lib/scraper';
import { generateEmailBody, sendEmail } from '@/lib/email';

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

  // Check if streaming is requested (for terminal feedback)
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const stream = searchParams.get('stream') === 'true';

  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // If streaming requested, use streaming response
  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (msg: string) => {
          controller.enqueue(encoder.encode(msg + '\n'));
        };

        try {
          await connectToDB();
          const products = await Product.find({});

          if (!products || products.length === 0) {
            send('No products to scrape');
            controller.close();
            return;
          }

          send(`Starting scrape for ${products.length} products...\n`);

          for (let i = 0; i < products.length; i++) {
            const currentProduct = products[i];
            const progress = `[${i + 1}/${products.length}]`;

            try {
              // Only show truncated title, no URLs for security
              const shortTitle =
                currentProduct.title?.substring(0, 30) || 'Unknown';
              send(`${progress} Scraping: ${shortTitle}...`);

              const scrapedProduct = await scrapeAmazonProduct(
                currentProduct.url,
              );

              if (!scrapedProduct) {
                results.failedCount++;
                send(`${progress} ✗ Failed`);
                continue;
              }

              const updatedPriceHistory = [
                ...currentProduct.priceHistory,
                { price: scrapedProduct.currentPrice },
              ];

              const product = {
                ...scrapedProduct,
                priceHistory: updatedPriceHistory,
                lowestPrice: getLowestPrice(updatedPriceHistory),
                highestPrice: getHighestPrice(updatedPriceHistory),
                averagePrice: getAveragePrice(updatedPriceHistory),
              };

              const updatedProduct = await Product.findOneAndUpdate(
                { url: product.url },
                product,
                { new: true },
              );

              if (!updatedProduct) {
                results.failedCount++;
                send(`${progress} ✗ Failed to update DB`);
                continue;
              }

              results.successCount++;
              send(
                `${progress} ✓ ${scrapedProduct.currentPrice} ${scrapedProduct.currency}`,
              );

              // Check for email notifications
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
                    // Email failed, continue
                  }
                }
              }
            } catch (error: any) {
              results.failedCount++;
              send(`${progress} ✗ Error: ${error.message?.substring(0, 50)}`);
            }
          }

          await closeBrowser();

          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          send(`\n✓ Complete in ${duration}s`);
          send(`  Success: ${results.successCount}`);
          send(`  Failed: ${results.failedCount}`);
          send(`  Emails: ${results.emailsSent}`);

          controller.close();
        } catch (error: any) {
          await closeBrowser();
          send(`\n✗ Fatal error: ${error.message}`);
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Non-streaming response (original behavior)
  try {
    await connectToDB();

    const products = await Product.find({});

    if (!products || products.length === 0) {
      return NextResponse.json({
        message: 'No products to scrape',
        data: results,
      });
    }

    console.log(`[Cron] Starting scrape for ${products.length} products`);

    // Process products sequentially
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

        // Check for email notifications
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
      } catch {
        results.failedCount++;
      }
    }

    await closeBrowser();

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
    await closeBrowser();

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
