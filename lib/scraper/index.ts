"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import {
  extractCurrency,
  extractDescription,
  extractPrice,
  extractSavingsPercentage,
} from "../utils";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  // BrightData proxy configuration
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);

  const port = 22225;
  const session_id = (100000 * Math.random()) | 0;
  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorized: false,
  };

  try {
    // fetch the product page

    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    // Extract the product title
    const title = $("#productTitle").text().trim();
    const currentPrice = extractPrice(
      //   $("span.apexPriceToPay span.a-price-whole"),
      //   $(".a.size.base.a-color-price"),
      //   $(".a-button-selected .a-color-base"),
      //   $(".a-price.span.a-offscreen"),
      $("span.a-price.a-text-price.a-size-medium.apexPriceToPay span"),
      $(
        "span.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay"
      )
    );

    const originalPrice = extractPrice(
      //   $("#priceblock_ourprice"),
      //   $(".a-price.a-text-price.a-size-base span.a-offscreen"),
      //   $("#listPrice"),
      //   $("priceblock_dealprice"),
      $("span.a-price.a-text-price.a-size-base span.a-offscreen"),
      $("span.a-size-small.a-color-secondary.aok-align-center.basisPrice")
      //   $(".a-size-base.a-color-price")
    );

    const outOfStock =
      $("#availability span").text().trim().toLowerCase() ===
      "currently unavailable";

    const images =
      $("#imgBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";

    const imageUrls = Object.keys(JSON.parse(images));

    const currency = extractCurrency($("span.a-price-symbol"));

    const discountText = $(
      "td.a-span12.a-color-price.a-size-base span.a-color-price"
    )
      .last()
      .text()
      .trim();

    const discountRate =
      $(".savingsPercentage").first().text().trim().replace(/[-%]/g, "") ||
      extractSavingsPercentage(discountText);

    // const description = extractDescription($);
    const description = $("#productDescription").text().trim() || "";

    const data = {
      url,
      currency: currency || "$",
      image: imageUrls[0] || "",
      title,
      description,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      category: "category",
      reviewsCount: "0",
      stars: 4.5,
      isOutOfStock: outOfStock,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      average: Number(currentPrice) || Number(originalPrice),
    };

    return data;
  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}
