import * as cheerio from "cheerio";
import { WarehouseData } from "../types";

// Helper to fetch a page and return cheerio
async function fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const html = await response.text();
  return cheerio.load(html);
}

// ── JAFZA (Jebel Ali Free Zone) ──
export async function scrapeJAFZA(): Promise<WarehouseData[]> {
  const warehouses: WarehouseData[] = [];
  
  try {
    const $ = await fetchPage("https://www.jafza.ae/our-businesses/");
    
    // JAFZA lists businesses in cards/tables
    $("article, .company-card, .business-item, tr").each((_, el) => {
      const $el = $(el);
      const name = $el.find("h2, h3, h4, .company-name, .name, td:first-child").first().text().trim();
      
      if (name && name.length > 2) {
        const phone = $el.find("a[href^='tel:'], .phone, .contact-phone").first().text().trim() ||
                      $el.find("a[href^='tel:']").attr("href")?.replace("tel:", "") || undefined;
        const email = $el.find("a[href^='mailto:'], .email").first().text().trim() ||
                      $el.find("a[href^='mailto:']").attr("href")?.replace("mailto:", "") || undefined;
        const website = $el.find("a[href^='http']:not([href*='jafza'])").attr("href") || undefined;

        if (name) {
          warehouses.push({
            name,
            city: "Dubai",
            country: "UAE",
            freeZone: "JAFZA",
            phone,
            email,
            website,
            source: "jafza",
            sourceUrl: "https://www.jafza.ae/our-businesses/",
          });
        }
      }
    });
  } catch (error) {
    console.error("JAFZA scrape failed:", error);
  }
  
  return warehouses;
}

// ── KIZAD (Khalifa Industrial Zone Abu Dhabi) ──
export async function scrapeKIZAD(): Promise<WarehouseData[]> {
  const warehouses: WarehouseData[] = [];
  
  try {
    const $ = await fetchPage("https://www.kizad.ae/tenants/");
    
    $("article, .tenant-card, .company-item, tr").each((_, el) => {
      const $el = $(el);
      const name = $el.find("h2, h3, h4, .company-name, td:first-child").first().text().trim();
      
      if (name && name.length > 2) {
        const phone = $el.find("a[href^='tel:'], .phone").first().text().trim() || undefined;
        const email = $el.find("a[href^='mailto:'], .email").first().text().trim() || undefined;
        
        warehouses.push({
          name,
          city: "Abu Dhabi",
          country: "UAE",
          freeZone: "KIZAD",
          phone,
          email,
          source: "kizad",
          sourceUrl: "https://www.kizad.ae/tenants/",
        });
      }
    });
  } catch (error) {
    console.error("KIZAD scrape failed:", error);
  }
  
  return warehouses;
}

// ── Yellow Pages UAE ──
export async function scrapeYellowPagesUAE(): Promise<WarehouseData[]> {
  const warehouses: WarehouseData[] = [];
  const cities = ["dubai", "abu-dhabi", "sharjah"];
  
  for (const city of cities) {
    try {
      const $ = await fetchPage(
        `https://www.yellowpages.ae/uae/search/warehousing/${city}`
      );
      
      $(".search-result, .listing, .result-item, .card").each((_, el) => {
        const $el = $(el);
        const name = $el.find(".company-name, h2, h3, .listing-title").first().text().trim();
        const phone = $el.find(".phone, .telephone, a[href^='tel:']").first().text().trim() || undefined;
        const address = $el.find(".address, .location, .listing-address").first().text().trim() || undefined;
        const website = $el.find("a[href^='http']:not([href*='yellowpages'])").attr("href") || undefined;

        if (name) {
          warehouses.push({
            name,
            address,
            city: city === "abu-dhabi" ? "Abu Dhabi" : city.charAt(0).toUpperCase() + city.slice(1),
            country: "UAE",
            phone,
            website,
            source: "yellowpages",
            sourceUrl: `https://www.yellowpages.ae/uae/search/warehousing/${city}`,
          });
        }
      });
    } catch (error) {
      console.error(`Yellow Pages UAE (${city}) scrape failed:`, error);
    }
  }
  
  return warehouses;
}

// ── Dubai Chamber Directory ──
export async function scrapeDubaiChamber(): Promise<WarehouseData[]> {
  const warehouses: WarehouseData[] = [];
  
  try {
    const $ = await fetchPage("https://www.dnbidirectory.com/company-search?category=warehousing");
    
    $("tr, .company-row, .result-item").each((_, el) => {
      const $el = $(el);
      const name = $el.find("td:first-child, .company-name, h3").first().text().trim();
      const phone = $el.find("td .phone, .telephone").first().text().trim() || undefined;
      const email = $el.find("a[href^='mailto:']").attr("href")?.replace("mailto:", "") || undefined;

      if (name && name.length > 2) {
        warehouses.push({
          name,
          city: "Dubai",
          country: "UAE",
          phone,
          email,
          source: "dubai_chamber",
          sourceUrl: "https://www.dnbidirectory.com/",
        });
      }
    });
  } catch (error) {
    console.error("Dubai Chamber scrape failed:", error);
  }
  
  return warehouses;
}

// ── Qatar Directory ──
export async function scrapeQatarDirectory(): Promise<WarehouseData[]> {
  const warehouses: WarehouseData[] = [];
  
  try {
    const $ = await fetchPage("https://www.qatardirectory.com/companies/category/warehousing");
    
    $(".company-item, .listing, .result-item, tr").each((_, el) => {
      const $el = $(el);
      const name = $el.find("h2, h3, .company-name, td:first-child").first().text().trim();
      const phone = $el.find("a[href^='tel:'], .phone").first().text().trim() || undefined;
      const address = $el.find(".address, .location").first().text().trim() || undefined;

      if (name && name.length > 2) {
        warehouses.push({
          name,
          address,
          country: "Qatar",
          city: "Doha",
          phone,
          source: "qatar_directory",
          sourceUrl: "https://www.qatardirectory.com/",
        });
      }
    });
  } catch (error) {
    console.error("Qatar Directory scrape failed:", error);
  }
  
  return warehouses;
}

// ── RAK FTZ (Ras Al Khaimah Free Trade Zone) ──
export async function scrapeRAKFTZ(): Promise<WarehouseData[]> {
  const warehouses: WarehouseData[] = [];
  
  try {
    const $ = await fetchPage("https://www.rakftz.com/about/companies");
    
    $("article, .company-card, .tenant-item, tr").each((_, el) => {
      const $el = $(el);
      const name = $el.find("h2, h3, h4, .company-name").first().text().trim();
      
      if (name && name.length > 2) {
        warehouses.push({
          name,
          city: "Ras Al Khaimah",
          country: "UAE",
          freeZone: "RAK FTZ",
          source: "rakftz",
          sourceUrl: "https://www.rakftz.com/",
        });
      }
    });
  } catch (error) {
    console.error("RAK FTZ scrape failed:", error);
  }
  
  return warehouses;
}

// ── Run all directory scrapers ──
export async function scrapeAllDirectories(): Promise<WarehouseData[]> {
  console.log("Starting directory scrapers...");
  
  const results = await Promise.allSettled([
    scrapeJAFZA(),
    scrapeKIZAD(),
    scrapeYellowPagesUAE(),
    scrapeDubaiChamber(),
    scrapeQatarDirectory(),
    scrapeRAKFTZ(),
  ]);
  
  const allWarehouses: WarehouseData[] = [];
  
  for (const result of results) {
    if (result.status === "fulfilled") {
      allWarehouses.push(...result.value);
      console.log(`  ✓ ${result.value.length} warehouses found`);
    } else {
      console.error(`  ✗ Scraper failed:`, result.reason);
    }
  }
  
  console.log(`Total from directories: ${allWarehouses.length}`);
  return allWarehouses;
}
