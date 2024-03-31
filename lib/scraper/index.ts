import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractPrice } from "../utils";

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
      $("span.a-price.a-text-price.a-size-medium.apexPriceToPay span")
    );

    const originalPrice = extractPrice(
      //   $("#priceblock_ourprice"),
      //   $(".a-price.a-text-price.a-size-base span.a-offscreen"),
      //   $("#listPrice"),
      //   $("priceblock_dealprice"),
      $("span.a-price.a-text-price.a-size-base span.a-offscreen")
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
    const discountRate = $("#savingsPercentage").text().replace(/[-%]/g, "");

    console.log({
      title,
      currentPrice,
      originalPrice,
      outOfStock,
      imageUrls,
      currency,
      discountRate,
    });
  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}
