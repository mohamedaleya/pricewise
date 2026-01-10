// Scraper utilities - used by API routes

import axios from 'axios';
import type { CheerioAPI } from 'cheerio';
import {
  extractCurrency,
  extractPrice,
  extractSavingsPercentage,
  inferCategory,
} from '../utils';

/**
 * Dynamic import of cheerio to avoid ESM class constructor issues with Bun
 */
async function loadCheerio(html: string): Promise<CheerioAPI> {
  const cheerio = await import('cheerio');
  return cheerio.load(html);
}

/**
 * User agents for rotation to avoid detection
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delay utility for retry logic
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get Accept-Language header based on Amazon domain
 */
function getAcceptLanguage(url: string): string {
  if (url.includes('amazon.fr')) return 'fr-FR,fr;q=0.9,en;q=0.8';
  if (url.includes('amazon.de')) return 'de-DE,de;q=0.9,en;q=0.8';
  if (url.includes('amazon.it')) return 'it-IT,it;q=0.9,en;q=0.8';
  if (url.includes('amazon.es')) return 'es-ES,es;q=0.9,en;q=0.8';
  if (url.includes('amazon.co.uk')) return 'en-GB,en;q=0.9';
  if (url.includes('amazon.in')) return 'en-IN,en;q=0.9';
  if (url.includes('amazon.co.jp')) return 'ja-JP,ja;q=0.9,en;q=0.8';
  return 'en-US,en;q=0.9';
}

/**
 * No-op function for API compatibility (no browser to close)
 */
export async function closeBrowser(): Promise<void> {
  // No browser to close with axios approach
}

/**
 * Scrape Amazon product using axios with browser-like headers
 * This approach works well for most Amazon pages without needing a full browser
 */
export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  // Retry logic - try up to 3 times with different user agents
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Scraper] Attempt ${attempt}/${maxRetries}`);

      // Random delay before request
      await randomDelay(500, 1500);

      const userAgent = getRandomUserAgent();
      const acceptLanguage = getAcceptLanguage(url);

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': userAgent,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': acceptLanguage,
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'sec-ch-ua':
            '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
        },
        // Follow redirects
        maxRedirects: 5,
        // Decompress response
        decompress: true,
      });

      const $ = await loadCheerio(response.data);

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
      const status = error.response?.status;
      console.error(
        `[Scraper] Attempt ${attempt} failed:`,
        error.message,
        status ? `(HTTP ${status})` : '',
      );

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
