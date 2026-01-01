'use server';

import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  extractCurrency,
  extractDescription,
  extractPrice,
  extractSavingsPercentage,
} from '../utils';

/**
 * Extract country code from Amazon URL for geo-targeting
 */
function getCountryCode(url: string): string {
  // Map Amazon TLDs to ScraperAPI country codes
  // Free tier supports 'us' and 'eu', so we map EU countries to 'eu'
  const tldMap: Record<string, string> = {
    'amazon.fr': 'eu',
    'amazon.de': 'eu',
    'amazon.it': 'eu',
    'amazon.es': 'eu',
    'amazon.nl': 'eu',
    'amazon.pl': 'eu',
    'amazon.se': 'eu',
    'amazon.co.uk': 'eu',
    'amazon.ca': 'us',
    'amazon.com.mx': 'us',
    'amazon.com': 'us',
    'amazon.in': 'us',
    'amazon.co.jp': 'us',
    'amazon.com.au': 'us',
  };

  for (const [domain, code] of Object.entries(tldMap)) {
    if (url.includes(domain)) return code;
  }
  return 'us';
}

/**
 * Delay utility for retry logic
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scrape Amazon product with retry logic
 */
export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  const apiKey = process.env.SCRAPER_API_KEY;
  const countryCode = getCountryCode(url);

  // Build ScraperAPI URL with premium features for reliability
  const params = new URLSearchParams({
    api_key: apiKey || '',
    url: url,
    render: 'true',
    country_code: countryCode,
    // Premium features for better success rate on Amazon
    premium: 'true', // Uses premium residential proxies
    keep_headers: 'true', // Maintains original headers
  });

  const scraperApiUrl = `https://api.scraperapi.com?${params.toString()}`;

  // Retry logic - try up to 2 times
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Scraping attempt ${attempt}/${maxRetries}: ${url}`);

      const response = await axios.get(scraperApiUrl, {
        timeout: 90000, // Increased timeout for premium requests
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,de;q=0.7',
        },
      });

      const $ = cheerio.load(response.data);

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

      // Validation with helpful debug info
      if (!title) {
        console.log(
          'Debug: No title found. Page might be blocked or different layout.',
        );
        throw new Error('Product title not found - page may be blocked');
      }

      if (!currentPrice) {
        console.log(
          'Debug: No price found. Available price elements:',
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
        category: 'category',
        reviewsCount: 100,
        stars: 4.5,
        isOutOfStock: outOfStock,
        updatedAt: new Date(),
        lowestPrice: Number(currentPrice) || Number(originalPrice),
        highestPrice: Number(originalPrice) || Number(currentPrice),
        averagePrice: Number(currentPrice) || Number(originalPrice),
      };

      console.log(`Successfully scraped: ${title.substring(0, 50)}...`);
      return data;
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = attempt * 2000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }

  throw new Error(
    `Failed to scrape product after ${maxRetries} attempts: ${lastError?.message}`,
  );
}
