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

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Fetch all products
    const products = await Product.find({}).lean();
    console.log(`Total products in database: ${products.length}\n`);

    if (products.length === 0) {
      console.log('No products found in the database.');
      await mongoose.disconnect();
      return;
    }

    // Display all products and their categories
    console.log('ALL PRODUCTS:');
    console.log('-'.repeat(80));

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\n[${i + 1}] ${product.title}`);
      console.log(`    Category: ${product.category || 'NONE'}`);
      console.log(`    Price: ${product.currency}${product.currentPrice}`);
      console.log(`    Created: ${product.createdAt}`);
    }

    // Category summary
    console.log('\n' + '='.repeat(80));
    console.log('CATEGORY SUMMARY:');
    console.log('='.repeat(80));

    const categoryCount: Record<string, number> = {};
    for (const product of products) {
      const cat = product.category || 'Uncategorized';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }

    for (const [category, count] of Object.entries(categoryCount).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`${category}: ${count} product(s)`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
