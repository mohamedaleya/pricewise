import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { PriceHistoryItem, Product } from '@/types';

const Notification = {
  WELCOME: 'WELCOME',
  CHANGE_OF_STOCK: 'CHANGE_OF_STOCK',
  LOWEST_PRICE: 'LOWEST_PRICE',
  THRESHOLD_MET: 'THRESHOLD_MET',
};

const THRESHOLD_PERCENTAGE = 40;

export function extractPrice(...elements: any) {
  for (const element of elements) {
    // If element is a Cheerio object with multiple matches, iterate through them
    // and take the first one that has valid price text
    const nodes = element.toArray ? element.toArray() : [element];

    for (const node of nodes) {
      // Get text from node safely whether it's a Cheerio node or raw string
      const priceText =
        node.children || node.length > 0
          ? element.constructor(node).text().trim()
          : (node.textContent || '').trim();

      if (priceText) {
        // Remove any whitespace between numbers (e.g., "1 234,56")
        let cleanPrice = priceText.replace(/\s/g, '');

        // Handle European format (1.234,56) vs US format (1,234.56)
        const lastComma = cleanPrice.lastIndexOf(',');
        const lastDot = cleanPrice.lastIndexOf('.');

        if (lastComma > lastDot && lastComma > cleanPrice.length - 4) {
          // European format: 1.234,56 → remove dots, replace comma with dot
          cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
        } else if (lastDot > lastComma && lastDot > cleanPrice.length - 4) {
          // US format: 1,234.56 → just remove commas
          cleanPrice = cleanPrice.replace(/,/g, '');
        }

        // Now remove all non-numeric characters EXCEPT the decimal dot
        // We only keep the last dot if multiple exist (though cleaning above should handle it)
        cleanPrice = cleanPrice.replace(/[^\d.]/g, '');

        if (cleanPrice) {
          // Ensure we only have one dot and it's the right one
          const parts = cleanPrice.split('.');
          if (parts.length > 2) {
            // If multiple dots, assume the last one is the decimal
            cleanPrice = parts.slice(0, -1).join('') + '.' + parts.slice(-1);
          }

          // Extract the first valid price pattern
          const priceMatch = cleanPrice.match(/\d+(\.\d+)?/)?.[0];
          if (priceMatch) {
            return priceMatch;
          }
        }
      }
    }
  }

  return '';
}

export function extractCurrency(element: any) {
  const currencyText = element.text().trim().slice(0, 1);

  return currencyText ? currencyText : '';
}

export function extractSavingsPercentage(element: any) {
  const start = element.indexOf(' (');
  const end = element.indexOf('%)');
  if (start !== -1 && end !== -1 && start < end) {
    const percentageText = element.substring(start + 2, end);
    const percentage = parseFloat(percentageText);
    if (!isNaN(percentage)) {
      return `${percentage}`;
    }
  }

  return 'No percentage found';
}

export function extractDescription($: any) {
  // these are possible elements holding description of the product
  const selectors = [
    '.a-unordered-list .a-list-item',
    '.a-expander-content p',
    // Add more selectors here if needed
  ];

  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      const textContent = elements
        .map((_: any, element: any) => $(element).text().trim())
        .get()
        .join('\n');
      return textContent;
    }
  }

  // If no matching elements were found, return an empty string
  return '';
}

export function getHighestPrice(priceList: PriceHistoryItem[]): number {
  let highestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price > highestPrice.price) {
      highestPrice = priceList[i];
    }
  }

  return highestPrice.price;
}

export function getHighestPriceWithDate(
  priceList: PriceHistoryItem[],
): PriceHistoryItem {
  let highestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price > highestPrice.price) {
      highestPrice = priceList[i];
    }
  }

  return highestPrice;
}

export function getLowestPrice(priceList: PriceHistoryItem[]): number {
  let lowestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price < lowestPrice.price) {
      lowestPrice = priceList[i];
    }
  }

  return lowestPrice.price;
}

export function getLowestPriceWithDate(
  priceList: PriceHistoryItem[],
): PriceHistoryItem {
  let lowestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price < lowestPrice.price) {
      lowestPrice = priceList[i];
    }
  }

  return lowestPrice;
}

export function getAveragePrice(priceList: PriceHistoryItem[]) {
  const sumOfPrices = priceList.reduce((acc, curr) => acc + curr.price, 0);
  const averagePrice = sumOfPrices / priceList.length || 0;

  return Number(averagePrice.toFixed(2));
}

export const getEmailNotifType = (
  scrapedProduct: Product,
  currentProduct: Product,
) => {
  const lowestPrice = getLowestPrice(currentProduct.priceHistory);

  if (scrapedProduct.currentPrice < lowestPrice) {
    return Notification.LOWEST_PRICE as keyof typeof Notification;
  }
  if (!scrapedProduct.isOutOfStock && currentProduct.isOutOfStock) {
    return Notification.CHANGE_OF_STOCK as keyof typeof Notification;
  }
  if (scrapedProduct.discountRate >= THRESHOLD_PERCENTAGE) {
    return Notification.THRESHOLD_MET as keyof typeof Notification;
  }

  return null;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price to avoid long floats and scientific notation
 * Max 2 decimal places, compact notation for very large numbers
 */
export function formatPrice(amount: number): string {
  // Handle invalid numbers
  if (!Number.isFinite(amount)) {
    return '0.00';
  }

  // For very large numbers, use compact notation
  if (amount >= 1000000) {
    return new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // For normal numbers, use 2 decimal places max
  return new Intl.NumberFormat('en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get currency symbol from currency code or symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
  };

  // If it's already a symbol, return it
  if (currency.length === 1) return currency;

  return symbols[currency.toUpperCase()] || currency;
}

/**
 * Enhanced category inference from product title keywords
 */
export function inferCategory(title: string): string {
  const titleLower = title.toLowerCase();

  // Books
  if (
    titleLower.match(
      /\b(das neinhorn|geburtstag|buch|hardcover|paperback|novel|story|author|books?|kling|edition|illustrated)\b/,
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
      /\b(laptop|notebook|macbook|chromebook|ultrabook|vivobook|zenbook|ideapad|thinkpad|gaming laptop)\b/,
    )
  ) {
    return 'Electronics > Laptops';
  }
  if (titleLower.match(/\b(tablet|ipad|galaxy tab|surface go|kindle fire)\b/)) {
    return 'Electronics > Tablets';
  }
  if (
    titleLower.match(
      /\b(headphone|earphone|earbud|airpods|headset|earbuds|noise cancelling|sony wh|bose)\b/,
    )
  ) {
    return 'Electronics > Headphones';
  }
  if (
    titleLower.match(/\b(monitor|display|screen|curved monitor|ultrawide)\b/) &&
    !titleLower.includes('baby')
  ) {
    return 'Electronics > Monitors';
  }
  if (
    titleLower.match(
      /\b(keyboard|mouse|webcam|usb hub|docking station|usb-c|adapter|cable|ssd|hard drive|ram|gpu)\b/,
    )
  ) {
    return 'Electronics > Computer Accessories';
  }

  // Home & Kitchen
  if (
    titleLower.match(
      /\b(vacuum|roomba|dyson|hoover|robot vacuum|cleaner|air purifier)\b/,
    )
  ) {
    return 'Home & Kitchen > Household Appliances';
  }
  if (
    titleLower.match(
      /\b(coffee|espresso|nespresso|keurig|coffee maker|coffee machine)\b/,
    )
  ) {
    return 'Home & Kitchen > Coffee Machines';
  }

  // Sports & Outdoors
  if (
    titleLower.match(
      /\b(treadmill|exercise bike|rowing machine|gym|workout|dumbbell)\b/,
    )
  ) {
    return 'Sports & Outdoors > Fitness Equipment';
  }

  // Fashion
  if (
    titleLower.match(
      /\b(shoes|sneakers|boots|sandals|heels|footwear|nike|adidas|puma)\b/,
    )
  ) {
    return 'Fashion > Footwear';
  }
  if (
    titleLower.match(/\b(watch|watches|rolex|casio|seiko|fossil|omega)\b/) &&
    !titleLower.match(/\b(smart|connect|gps)\b/)
  ) {
    return 'Fashion > Watches';
  }

  // Default fallback
  return 'General';
}

/**
 * Amazon tracking parameters to strip from URLs
 */
const AMAZON_TRACKING_PARAMS = [
  'ref',
  'ref_',
  'tag',
  'linkCode',
  'linkId',
  'camp',
  'creative',
  'creativeASIN',
  'psc',
  'pd_rd_i',
  'pd_rd_r',
  'pd_rd_w',
  'pd_rd_wg',
  'pf_rd_i',
  'pf_rd_m',
  'pf_rd_p',
  'pf_rd_r',
  'pf_rd_s',
  'pf_rd_t',
  'qid',
  'sr',
  'keywords',
  'dib',
  'dib_tag',
  'sprefix',
  'crid',
  'th',
  'encoding',
  'smid',
  'spLa',
  '_encoding',
];

/**
 * Extract ASIN (Amazon Standard Identification Number) from URL
 * ASIN is a 10-character alphanumeric code
 */
export function extractAsin(url: string): string | null {
  // Pattern 1: /dp/ASIN or /product/ASIN
  const dpMatch = url.match(/\/(?:dp|product)\/([A-Z0-9]{10})/i);
  if (dpMatch) return dpMatch[1].toUpperCase();

  // Pattern 2: /gp/product/ASIN
  const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (gpMatch) return gpMatch[1].toUpperCase();

  // Pattern 3: /gp/aw/d/ASIN (mobile)
  const mobileMatch = url.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i);
  if (mobileMatch) return mobileMatch[1].toUpperCase();

  // Pattern 4: ASIN= query parameter
  const asinParam = url.match(/[?&]ASIN=([A-Z0-9]{10})/i);
  if (asinParam) return asinParam[1].toUpperCase();

  return null;
}

/**
 * Get the Amazon domain from a URL
 */
export function getAmazonDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Match amazon.* or amazon.co.* patterns
    const domainMatch = hostname.match(
      /amazon\.(com|co\.[a-z]{2}|[a-z]{2,3})/i,
    );
    if (domainMatch) {
      return `amazon.${domainMatch[1].toLowerCase()}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalize an Amazon product URL to a canonical form for duplicate detection
 * This strips tracking parameters and creates a consistent URL format
 */
export function normalizeAmazonUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    AMAZON_TRACKING_PARAMS.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    // Try to extract ASIN for canonical URL
    const asin = extractAsin(url);
    const domain = getAmazonDomain(url);

    if (asin && domain) {
      // Return canonical ASIN-based URL
      return `https://www.${domain}/dp/${asin}`;
    }

    // If we can't extract ASIN, clean up the existing URL
    // Remove hash and normalize
    parsed.hash = '';

    // Ensure www prefix for consistency
    if (!parsed.hostname.startsWith('www.')) {
      parsed.hostname = 'www.' + parsed.hostname;
    }

    // Remove trailing slash from pathname
    parsed.pathname = parsed.pathname.replace(/\/$/, '');

    return parsed.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Check if two Amazon URLs point to the same product
 */
export function isSameProduct(url1: string, url2: string): boolean {
  return normalizeAmazonUrl(url1) === normalizeAmazonUrl(url2);
}
