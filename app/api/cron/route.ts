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
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== process.env.CRON_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    connectToDB();

    const products = await Product.find({});

    if (!products) throw new Error('No product fetched');

    // ======================== 1 SCRAPE LATEST PRODUCT DETAILS & UPDATE DB
    const updatedProducts = await Promise.all(
      products.map(async (currentProduct) => {
        // Scrape product
        const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

        if (!scrapedProduct) return;

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
          {
            url: product.url,
          },
          product,
        );

        // ======================== 2 CHECK EACH PRODUCT'S STATUS & SEND EMAIL ACCORDINGLY
        const emailNotifType = getEmailNotifType(
          scrapedProduct,
          currentProduct,
        );

        if (emailNotifType && updatedProduct.users.length > 0) {
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

          // Send email to each user individually to allow personalized unsubscribe links
          await Promise.all(
            updatedProduct.users.map(async (user: any) => {
              const emailContent = await generateEmailBody(
                productInfo,
                emailNotifType,
                user.email,
              );
              return sendEmail(emailContent, [user.email]);
            }),
          );
        }

        return updatedProduct;
      }),
    );

    return NextResponse.json({
      message: 'Ok',
      data: updatedProducts,
    });
  } catch (error: any) {
    throw new Error(`Failed to get all products: ${error.message}`);
  }
}
