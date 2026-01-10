'use server';

import * as cheerio from 'cheerio';
import puppeteer, { Browser } from 'puppeteer';
import {
  extractCurrency,
  extractPrice,
  extractSavingsPercentage,
  inferCategory,
} from '../utils';

/**
 * User agents for rotation to avoid detection
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

/**
 * Get a random user agent
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Random delay to simulate human behavior
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Delay utility for retry logic
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Browser instance cache for reuse
let browserInstance: Browser | null = null;

/**
 * Get or create a browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        // Docker-specific flags
        '--disable-crash-reporter',
        '--disable-crashpad',
        '--disable-breakpad',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--disable-default-apps',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });
  }
  return browserInstance;
}

/**
 * Close the browser instance (call on cleanup)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Scrape Amazon product with Puppeteer (self-hosted, no API credits)
 */
export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  // Retry logic - try up to 3 times
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let page = null;

    try {
      console.log(`[Scraper] Attempt ${attempt}/${maxRetries}`);

      const browser = await getBrowser();
      page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(getRandomUserAgent());

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Random delay before navigation
      await randomDelay(500, 1500);

      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait a bit for dynamic content
      await randomDelay(1000, 2000);

      // Get page HTML
      const html = await page.content();

      // Close the page
      await page.close();
      page = null;

      const $ = cheerio.load(html);

      // Extract product title
      const title = $('#productTitle').text().trim();

      // Multiple price selectors to handle different locales
      const currentPrice = extractPrice(
        // Primary selectors
        $('span.a-price.a-text-price.a-size-medium.apexPriceToPay span'),
        $(
          'span.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay',
        ),
        $('span.priceToPay span.a-offscreen'),
        // Generic price selectors
        $('span.a-price span.a-offscreen').first(),
        $('#corePrice_feature_div span.a-offscreen').first(),
        $('#corePriceDisplay_desktop_feature_div span.a-offscreen').first(),
        // Legacy selectors
        $('#priceblock_ourprice'),
        $('#priceblock_dealprice'),
        $('.a-price .a-offscreen').first(),
        // EU-specific selectors
        $('#tp_price_block_total_price span.a-offscreen'),
        $('span[data-a-color="price"] span.a-offscreen').first(),
      );

      const originalPrice = extractPrice(
        $('span.a-price.a-text-price.a-size-base span.a-offscreen'),
        $('span.a-size-small.a-color-secondary.aok-align-center.basisPrice'),
        $('span.basisPrice span.a-offscreen'),
        $('#listPrice'),
        $('.a-text-price span.a-offscreen').first(),
      );

      const outOfStock =
        $('#availability span')
          .text()
          .trim()
          .toLowerCase()
          .includes('unavailable') ||
        $('#availability span')
          .text()
          .trim()
          .toLowerCase()
          .includes('indisponible') ||
        $('#availability span')
          .text()
          .trim()
          .toLowerCase()
          .includes('nicht verfügbar');

      const images =
        $('#imgBlkFront').attr('data-a-dynamic-image') ||
        $('#landingImage').attr('data-a-dynamic-image') ||
        '{}';

      let imageUrls: string[] = [];
      try {
        imageUrls = Object.keys(JSON.parse(images));
      } catch {
        imageUrls = [];
      }

      const currency = extractCurrency($('span.a-price-symbol'));

      const discountText = $(
        'td.a-span12.a-color-price.a-size-base span.a-color-price',
      )
        .last()
        .text()
        .trim();

      const discountRate =
        $('.savingsPercentage').first().text().trim().replace(/[-%]/g, '') ||
        extractSavingsPercentage(discountText);

      const description = $('#productDescription').text().trim() || '';

      // Extract category from breadcrumbs
      const categorySelectors = [
        '#wayfinding-breadcrumbs_container ul li:last-child a',
        '#wayfinding-breadcrumbs_feature_div ul li:last-child a',
        '.a-breadcrumb li:last-child a',
        '#nav-subnav .nav-a-content',
        'ul.a-unordered-list.a-horizontal.a-size-small li:last-child a',
      ];

      let category = 'General';
      for (const selector of categorySelectors) {
        const categoryText = $(selector).text().trim();
        if (
          categoryText &&
          categoryText.length > 0 &&
          categoryText.length < 50 &&
          categoryText.toLowerCase() !== 'category'
        ) {
          category = categoryText;
          break;
        }
      }

      // Fallback to title-based inference if category is still General or placeholder
      if (category === 'General' || category.toLowerCase() === 'category') {
        category = inferCategory(title);
      }

      // Validation with helpful debug info
      if (!title) {
        console.log(
          '[Scraper] Debug: No title found. Page might be blocked or different layout.',
        );
        throw new Error('Product title not found - page may be blocked');
      }

      if (!currentPrice) {
        console.log(
          '[Scraper] Debug: No price found. Available price elements:',
          $('span.a-price').length,
        );
        throw new Error('Product price not found - selectors may need update');
      }

      const data = {
        url,
        currency: currency || '€',
        image: imageUrls[0] || '',
        title,
        description,
        createdAt: new Date(),
        currentPrice: Number(currentPrice) || Number(originalPrice),
        originalPrice: Number(originalPrice) || Number(currentPrice),
        priceHistory: [],
        discountRate: Number(discountRate) || 0,
        category,
        reviewsCount: 100,
        stars: 4.5,
        isOutOfStock: outOfStock,
        updatedAt: new Date(),
        lowestPrice: Number(currentPrice) || Number(originalPrice),
        highestPrice: Number(originalPrice) || Number(currentPrice),
        averagePrice: Number(currentPrice) || Number(originalPrice),
      };

      console.log(`[Scraper] ✓ Success: ${title.substring(0, 40)}...`);

      return data;
    } catch (error: any) {
      lastError = error;
      console.error(`[Scraper] Attempt ${attempt} failed:`, error.message);

      // Cleanup page on error
      if (page) {
        try {
          await page.close();
        } catch {
          // Ignore close errors
        }
      }

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = attempt * 3000;
        console.log(`[Scraper] Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }

  throw new Error(
    `Failed to scrape product after ${maxRetries} attempts: ${lastError?.message}`,
  );
}
