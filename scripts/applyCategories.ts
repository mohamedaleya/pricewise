import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Product schema (matching the main model)
const productSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, unique: true },
    currency: { type: String, required: true },
    image: { type: String, required: true },
    title: { type: String, required: true },
    currentPrice: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    priceHistory: [
      {
        price: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
    lowestPrice: { type: Number },
    highestPrice: { type: Number },
    createdAt: { type: Date, default: Date.now },
    averagePrice: { type: Number },
    discountRate: { type: Number },
    description: { type: String },
    category: { type: String },
    reviewsCount: { type: Number },
    isOutOfStock: { type: Boolean, default: false },
    users: [{ email: { type: String, required: true } }],
  },
  { timestamps: true },
);

const Product =
  mongoose.models.Product || mongoose.model('Product', productSchema);

/**
 * Enhanced category inference from product title keywords
 */
function inferCategory(title: string): string {
  const titleLower = title.toLowerCase();

  // Books (Specific match for the user's screenshot product)
  if (
    titleLower.match(
      /\b(das neinhorn|geburtstag|buch|hardcover|paperback|novel|story|author|books?|kling)\b/,
    )
  ) {
    return 'Books';
  }

  // Electronics & Computing
  if (
    titleLower.match(
      /\b(phone|iphone|samsung|smartphone|mobile|android|huawei|xiaomi|pixel)\b/,
    )
  ) {
    return 'Electronics > Cell Phones';
  }
  if (
    titleLower.match(
      /\b(laptop|notebook|macbook|chromebook|ultrabook|vivobook)\b/,
    )
  ) {
    return 'Electronics > Laptops';
  }
  if (titleLower.match(/\b(tablet|ipad|galaxy tab)\b/)) {
    return 'Electronics > Tablets';
  }
  if (
    titleLower.match(
      /\b(headphone|earphone|earbud|airpods|headset|earbuds|noise cancelling)\b/,
    )
  ) {
    return 'Electronics > Headphones';
  }
  if (
    titleLower.match(/\b(monitor|display|screen|curved monitor)\b/) &&
    !titleLower.includes('baby')
  ) {
    return 'Electronics > Monitors';
  }
  if (
    titleLower.match(
      /\b(keyboard|mouse|webcam|usb hub|docking station|usb-c|adapter|cable)\b/,
    )
  ) {
    return 'Electronics > Computer Accessories';
  }
  if (
    titleLower.match(
      /\b(camera|dslr|mirrorless|canon|nikon|sony alpha|gopro)\b/,
    )
  ) {
    return 'Electronics > Cameras';
  }
  if (
    titleLower.match(/\b(tv|television|smart tv|4k|oled|samsung tv|lg tv)\b/)
  ) {
    return 'Electronics > Television';
  }
  if (
    titleLower.match(
      /\b(speaker|soundbar|bluetooth speaker|home theater|audio)\b/,
    )
  ) {
    return 'Electronics > Speakers & Audio';
  }
  if (
    titleLower.match(
      /\b(smartwatch|apple watch|fitness tracker|garmin|fitbit|watch)\b/,
    ) &&
    titleLower.match(/\b(smart|connect|gps)\b/)
  ) {
    return 'Electronics > Wearables';
  }

  // Home & Kitchen
  if (
    titleLower.match(/\b(vacuum|roomba|dyson|hoover|robot vacuum|cleaner)\b/)
  ) {
    return 'Home & Kitchen > Vacuum Cleaners';
  }
  if (
    titleLower.match(
      /\b(coffee|espresso|nespresso|keurig|coffee maker|coffee machine)\b/,
    )
  ) {
    return 'Home & Kitchen > Coffee Machines';
  }
  if (
    titleLower.match(
      /\b(microwave|oven|toaster|air fryer|instant pot|cooker)\b/,
    )
  ) {
    return 'Home & Kitchen > Kitchen Appliances';
  }
  if (titleLower.match(/\b(pan|pot|cookware|knife|knives|utensil|kitchen)\b/)) {
    return 'Home & Kitchen > Cookware';
  }

  // Sports & Outdoors
  if (
    titleLower.match(/\b(treadmill|exercise bike|rowing machine|gym|workout)\b/)
  ) {
    return 'Sports & Outdoors > Fitness Equipment';
  }

  // Fashion
  if (titleLower.match(/\b(shoes|sneakers|boots|sandals|heels|footwear)\b/)) {
    return 'Fashion > Footwear';
  }
  if (titleLower.match(/\b(watch|watches|rolex|casio|seiko)\b/)) {
    return 'Fashion > Watches';
  }

  // Default fallback
  return 'General';
}

/**
 * Fix corrupted prices (e.g., 150015001500)
 */
function fixPrice(price: number): number {
  if (price > 1000000) {
    // If price is unusually high, it might be concatenated.
    // We'll try to extract a reasonable price from the string version.
    const priceStr = price.toString();
    // Often it repeats the same price multiple times, e.g., 15001500
    // We'll take the first few digits that make sense.
    // For now, let's just take the first 4-5 digits if they look like a price.
    // or better, if the price history has a better price, we use that.
    return price; // Placeholder, logic applied below in main
  }
  return price;
}

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find({});
    console.log(`Analyzing ${products.length} products...\n`);

    let updatedCount = 0;
    for (const product of products) {
      let needsUpdate = false;
      const updateData: any = {};

      // 1. Check for bad categories
      const currentCategory = product.category || '';
      const newCategory = inferCategory(product.title);

      if (
        currentCategory === 'Category' ||
        currentCategory === 'General' ||
        currentCategory === '' ||
        currentCategory.toLowerCase().includes('category')
      ) {
        updateData.category = newCategory;
        needsUpdate = true;
      } else if (newCategory !== 'General' && currentCategory === 'General') {
        // Upgrade from General to a specific category
        updateData.category = newCategory;
        needsUpdate = true;
      }

      // 2. Check for corrupted prices (Concatenated numbers)
      // Example from screenshot: €150,015,001,500
      if (product.currentPrice > 1000000 || product.originalPrice > 1000000) {
        console.log(
          `⚠️  Detected suspicious price for: ${product.title.substring(0, 50)}`,
        );

        // Try to recover from priceHistory if valid entries exist
        const validHistory = product.priceHistory.filter(
          (h: any) => h.price < 1000000,
        );
        if (validHistory.length > 0) {
          const recoveredPrice = validHistory[validHistory.length - 1].price;
          updateData.currentPrice = recoveredPrice;
          updateData.originalPrice = recoveredPrice;
          updateData.lowestPrice = Math.min(
            ...validHistory.map((h: any) => h.price),
          );
          updateData.highestPrice = Math.max(
            ...validHistory.map((h: any) => h.price),
          );
          updateData.averagePrice =
            validHistory.reduce((a: any, b: any) => a + b.price, 0) /
            validHistory.length;
          // Filter out bad history entries
          updateData.priceHistory = validHistory;
          needsUpdate = true;
          console.log(`   ✅ Recovered price from history: ${recoveredPrice}`);
        } else {
          // Fallback: try to slice the concatenated number if it repeats
          const pStr = product.currentPrice.toString();
          // Heuristic: if price is like 150015001500, we want 15.00
          // This is hard to guess automatically without context.
          // Let's check the title for clues or just set a placeholder.
          console.log(
            `   ❌ Could not recover price from history. Needs manual fix or re-scrape.`,
          );
        }
      }

      if (needsUpdate) {
        console.log(`🔄 Updating: ${product.title.substring(0, 40)}...`);
        if (updateData.category)
          console.log(`   New Category: ${updateData.category}`);

        await Product.updateOne({ _id: product._id }, { $set: updateData });
        updatedCount++;
      }
    }

    console.log(
      `\n🎉 Successfully reviewed all products. Updated ${updatedCount} entries.`,
    );

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
