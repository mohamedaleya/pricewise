'use server';

import ExchangeRate from './models/exchangeRate.model';
import { connectToDB } from './mongoose';

// Currency symbol to code mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '£': 'GBP',
  '€': 'EUR',
  '₹': 'INR',
  '¥': 'JPY',
  A$: 'AUD',
  C$: 'CAD',
  '₿': 'BTC',
};

/**
 * Fetch exchange rates from API and cache in MongoDB
 */
export async function fetchAndCacheRates(): Promise<boolean> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    console.error('EXCHANGE_RATE_API_KEY not configured');
    return false;
  }

  try {
    // exchangeratesapi.io free tier uses EUR as base
    const response = await fetch(
      `https://api.exchangeratesapi.io/v1/latest?access_key=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`API returned error: ${JSON.stringify(data.error)}`);
    }

    await connectToDB();

    // Store the rates with full timestamp
    await ExchangeRate.create({
      base: data.base || 'EUR',
      fetchedAt: new Date(),
      rates: data.rates,
    });

    console.log(
      `Exchange rates cached at ${new Date().toISOString()}`,
      `Currencies: ${Object.keys(data.rates).length}`,
    );

    return true;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return false;
  }
}

interface IExchangeRate {
  fetchedAt: Date;
  rates: Record<string, number>;
  base: string;
}

/**
 * Get the latest cached exchange rates
 */
export async function getLatestRates(): Promise<Map<string, number> | null> {
  try {
    await connectToDB();

    const latest = (await ExchangeRate.findOne()
      .sort({ fetchedAt: -1 })
      .lean()) as IExchangeRate | null;

    if (!latest) {
      console.warn('No cached exchange rates found, using fallback rates');
      return getFallbackRates();
    }

    // Check if rates are older than 24 hours (stale warning)
    const ageHours =
      (Date.now() - new Date(latest.fetchedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > 24) {
      console.warn(`Exchange rates are ${ageHours.toFixed(1)} hours old`);
    }

    return new Map(Object.entries(latest.rates));
  } catch (error) {
    console.error('Failed to get cached rates:', error);
    return getFallbackRates();
  }
}

/**
 * Fallback rates in case DB/API is unavailable
 */
function getFallbackRates(): Map<string, number> {
  return new Map([
    ['USD', 1.09],
    ['GBP', 0.85],
    ['INR', 90.5],
    ['JPY', 162.0],
    ['AUD', 1.65],
    ['CAD', 1.48],
    ['EUR', 1.0],
  ]);
}

/**
 * Convert a currency symbol to its code (internal helper)
 */
function currencySymbolToCode(symbol: string): string {
  return CURRENCY_SYMBOLS[symbol] || symbol;
}

/**
 * Convert an amount from any currency to EUR
 */
export async function convertToEuro(
  amount: number,
  fromCurrency: string,
): Promise<number> {
  // If already EUR, return as is
  const currencyCode = currencySymbolToCode(fromCurrency);
  if (currencyCode === 'EUR') {
    return amount;
  }

  const rates = await getLatestRates();
  if (!rates) {
    console.warn('Using 1:1 rate as fallback');
    return amount;
  }

  const rate = rates.get(currencyCode);
  if (!rate) {
    console.warn(`No rate found for ${currencyCode}, using 1:1`);
    return amount;
  }

  // API rates are "1 EUR = X currency", so we divide to convert to EUR
  return amount / rate;
}

/**
 * Get exchange rate info for display (returns rate and when it was fetched)
 */
export async function getExchangeRateInfo(): Promise<{
  rates: Map<string, number>;
  fetchedAt: Date | null;
} | null> {
  try {
    await connectToDB();

    const latest = (await ExchangeRate.findOne()
      .sort({ fetchedAt: -1 })
      .lean()) as IExchangeRate | null;

    if (!latest) {
      return { rates: getFallbackRates(), fetchedAt: null };
    }

    return {
      rates: new Map(Object.entries(latest.rates)),
      fetchedAt: new Date(latest.fetchedAt),
    };
  } catch (error) {
    console.error('Failed to get exchange rate info:', error);
    return null;
  }
}
