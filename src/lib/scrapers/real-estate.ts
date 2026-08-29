import * as cheerio from "cheerio";
import { WarehouseData } from "../types";

async function fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return cheerio.load(await response.text());
}

// ── Bayut.com (Commercial Warehouses) ──
export async function scrapeBayut(): Promise<WarehouseData[]> {
  const warehouses: WarehouseData[] = [];
  const urls = [
    "https://www.bayut.com/commercial-property-for-rent/dubai/warehouses/",
    "https://www.bayut.com/commercial-property-for-rent/abu-dhabi/warehouses/",
    "https://www.bayut.com/commercial-property-for-sale/dubai/warehouses/",
  ];

  for (const url of urls) {
    try {
      const $ = await fetchPage(url);
      const city = url.includes("abu-dhabi") ? "Abu Dhabi" : "Dubai";

      // Bayut uses article cards for listings
      $("article, .listing-card, [data-testid='listing-card']").each((_, el) => {
        const $el = $(el);
        const title = $el.find("h2, h3, .listing-title, [data-testid='listing-title']").first().text().trim();
        const phone = $el.find("a[href^='tel:'], .agent-phone, [data-testid='agent-phone']").first().text().trim() || undefined;
        const agentName = $el.find(".agent-name, [data-testid='agent-name']").first().text().trim() || undefined;
        const link = $el.find("a").attr("href") || undefined;

        // Extract size and price from listing details
        const details = $el.find(".listing-details, .property-details").text();

        if (title) {
          warehouses.push({
            name: title,
            city,
            country: "UAE",
            phone,
            website: link?.startsWith("http") ? link : link ? `https://www.bayut.com${link}` : undefined,
            source: "bayut",
            sourceUrl: url,
            tags: ["commercial"],
          });
        }
      });
    } catch (error) {
      console.error(`Bayut scrape failed (${url}):`, error);
    }
  }

  return warehouses;
}

// ── Dubizzle (Commercial Warehouses) ──
export async function scrapeDubizzle(): Promise<WarehouseData[]> {
  const warehouses: WarehouseData[] = [];
  const urls = [
    "https://www.dubizzle.com/en/properties/commercial-for-rent/warehouses__warehouses/?cities=dubai",
    "https://www.dubizzle.com/en/properties/commercial-for-rent/warehouses__warehouses/?cities=abu-dhabi",
  ];

  for (const url of urls) {
    try {
      const $ = await fetchPage(url);
      const city = url.includes("abu-dhabi") ? "Abu Dhabi" : "Dubai";

      $("[data-testid='listing-ad'], .listing, .ad-card").each((_, el) => {
        const $el = $(el);
        const title = $el.find("h2, h3, .title, [data-testid='listing-title']").first().text().trim();
        const phone = $el.find("[data-testid='phone-number'], .phone").first().text().trim() || undefined;
        const link = $el.find("a").attr("href") || undefined;

        if (title) {
          warehouses.push({
            name: title,
            city,
            country: "UAE",
            phone,
            website: link?.startsWith("http") ? link : link ? `https://www.dubizzle.com${link}` : undefined,
            source: "dubizzle",
            sourceUrl: url,
            tags: ["commercial"],
          });
        }
      });
    } catch (error) {
      console.error(`Dubizzle scrape failed (${url}):`, error);
    }
  }

  return warehouses;
}

// ── PropertyFinder (Commercial) ──
export async function scrapePropertyFinder(): Promise<WarehouseData[]> {
  const warehouses: WarehouseData[] = [];
  const urls = [
    "https://www.propertyfinder.ae/en/commercial-for-rent/warehouses-in-dubai.html",
    "https://www.propertyfinder.ae/en/commercial-for-rent/warehouses-in-abu-dhabi.html",
  ];

  for (const url of urls) {
    try {
      const $ = await fetchPage(url);
      const city = url.includes("abu-dhabi") ? "Abu Dhabi" : "Dubai";

      $(".listing-card, article, .property-card").each((_, el) => {
        const $el = $(el);
        const title = $el.find("h2, h3, .listing-title").first().text().trim();
        const phone = $el.find("a[href^='tel:'], .phone").first().text().trim() || undefined;
        const link = $el.find("a").attr("href") || undefined;

        if (title) {
          warehouses.push({
            name: title,
            city,
            country: "UAE",
            phone,
            website: link?.startsWith("http") ? link : link ? `https://www.propertyfinder.ae${link}` : undefined,
            source: "propertyfinder",
            sourceUrl: url,
            tags: ["commercial"],
          });
        }
      });
    } catch (error) {
      console.error(`PropertyFinder scrape failed (${url}):`, error);
    }
  }

  return warehouses;
}

// ── Run all real estate scrapers ──
export async function scrapeAllRealEstate(): Promise<WarehouseData[]> {
  console.log("Starting real estate platform scrapers...");

  const results = await Promise.allSettled([
    scrapeBayut(),
    scrapeDubizzle(),
    scrapePropertyFinder(),
  ]);

  const allWarehouses: WarehouseData[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allWarehouses.push(...result.value);
      console.log(`  ✓ ${result.value.length} listings found`);
    } else {
      console.error(`  ✗ Scraper failed:`, result.reason);
    }
  }

  console.log(`Total from real estate platforms: ${allWarehouses.length}`);
  return allWarehouses;
}
