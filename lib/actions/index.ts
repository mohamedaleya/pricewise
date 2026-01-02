'use server';

import { revalidatePath } from 'next/cache';
import Product from '../models/product.model';
import { connectToDB } from '../mongoose';
import { scrapeAmazonProduct } from '../scraper';
import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice,
  normalizeAmazonUrl,
} from '../utils';
import { User } from '@/types';
import { generateEmailBody, sendEmail } from '../nodemailer';

export type ScrapeResult = {
  productId: string;
  isExisting: boolean;
};

export async function scrapeAndStoreProduct(
  productUrl: string,
): Promise<ScrapeResult | null> {
  if (!productUrl) return null;

  try {
    await connectToDB();

    // Normalize URL first for consistent duplicate detection
    const normalizedUrl = normalizeAmazonUrl(productUrl);

    // Check if product already exists BEFORE scraping (saves API credits)
    const existingProduct = await Product.findOne({ url: normalizedUrl });

    if (existingProduct) {
      // Product already tracked - return immediately without scraping
      return {
        productId: existingProduct._id.toString(),
        isExisting: true,
      };
    }

    // Product doesn't exist - scrape it
    const scrapedProduct = await scrapeAmazonProduct(productUrl);

    if (!scrapedProduct) return null;

    // Ensure we store with normalized URL
    const productData = {
      ...scrapedProduct,
      url: normalizedUrl,
    };

    const initialPriceHistory: any = [
      { price: scrapedProduct.originalPrice, date: new Date() },
      { price: scrapedProduct.currentPrice, date: new Date() },
    ];

    const product = {
      ...productData,
      priceHistory: initialPriceHistory,
      lowestPrice: getLowestPrice(initialPriceHistory),
      highestPrice: getHighestPrice(initialPriceHistory),
      averagePrice: getAveragePrice(initialPriceHistory),
    };

    const newProduct = await Product.findOneAndUpdate(
      { url: normalizedUrl },
      product,
      { upsert: true, new: true },
    );

    revalidatePath(`/products/${newProduct._id}`);
    revalidatePath('/', 'layout');

    return {
      productId: newProduct._id.toString(),
      isExisting: false,
    };
  } catch (error: any) {
    throw new Error(`Failed to create/update product: ${error.message}`);
  }
}

export async function getProductById(productId: string) {
  try {
    connectToDB();

    const product = await Product.findOne({ _id: productId });

    if (!product) return null;

    return product;
  } catch (error) {
    console.log(error);
  }
}

export async function getAllProducts() {
  try {
    connectToDB();

    const products = await Product.find();

    return products;
  } catch (error) {
    console.log(error);
  }
}

export async function getSimilarProducts(productId: string) {
  try {
    connectToDB();

    const currentProduct = await Product.findById(productId);

    if (!currentProduct) return null;

    const similarProducts = await Product.find({
      _id: { $ne: productId },
    }).limit(3);

    return similarProducts;
  } catch (error) {
    console.log(error);
  }
}

export async function addUserEmailToProduct(
  productId: string,
  userEmail: string,
) {
  try {
    const product = await Product.findById(productId);

    if (!product) return;

    const userExists = product.users.some(
      (user: User) => user.email === userEmail,
    );

    if (!userExists) {
      product.users.push({ email: userEmail });

      await product.save();

      const emailContent = await generateEmailBody(
        { ...product.toObject(), productId: product._id.toString() },
        'WELCOME',
        userEmail,
      );

      await sendEmail(emailContent, [userEmail]);
    }
  } catch (error) {
    console.log(error);
  }
}

export async function getProductsPaginated(
  page: number = 1,
  limit: number = 12,
  sortBy: 'title' | 'createdAt' | 'updatedAt' | 'currentPrice' = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
) {
  try {
    await connectToDB();

    const skip = (page - 1) * limit;

    // Build sort object
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // Get total count for pagination info
    const total = await Product.countDocuments();

    // Get paginated and sorted products
    const products = await Product.find()
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return {
      items: JSON.parse(JSON.stringify(products)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  } catch (error) {
    console.log(error);
    return {
      items: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    };
  }
}

export async function unsubscribeUser(productId: string, userEmail: string) {
  try {
    await connectToDB();

    const product = await Product.findById(productId);

    if (!product) return { success: false, message: 'Product not found' };

    // Filter out the user's email
    const initialUserCount = product.users.length;
    product.users = product.users.filter(
      (user: User) => user.email !== userEmail,
    );

    if (product.users.length === initialUserCount) {
      return { success: false, message: 'Email not found in subscribers' };
    }

    await product.save();
    revalidatePath(`/products/${productId}`);

    return { success: true, message: 'Successfully unsubscribed' };
  } catch (error) {
    console.log(error);
    return { success: false, message: 'Failed to unsubscribe' };
  }
}

export async function getTrackedProducts(userEmail: string) {
  try {
    await connectToDB();

    const products = await Product.find({
      'users.email': userEmail,
    });

    return JSON.parse(JSON.stringify(products));
  } catch (error) {
    console.log(error);
    return [];
  }
}
