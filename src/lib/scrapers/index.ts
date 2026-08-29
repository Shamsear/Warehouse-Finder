import { prisma } from "../prisma";
import { deduplicateWarehouses } from "../dedup";
import { scrapeGooglePlaces } from "./google-places";
import { scrapeAllDirectories } from "./directories";
import { scrapeAllRealEstate } from "./real-estate";
import { scrapeAllGoogleSearch } from "./google-search";
import { WarehouseData } from "../types";

export interface ScrapeResult {
  source: string;
  country: string;
  count: number;
  success: boolean;
  error?: string;
  duration: number;
}

// Save warehouses to database, handling duplicates
async function saveWarehousesToDb(
  warehouses: WarehouseData[],
  source: string
): Promise<number> {
  let saved = 0;

  for (const w of warehouses) {
    try {
      // Check for existing warehouse by name similarity and phone
      const existing = await prisma.warehouse.findFirst({
        where: {
          OR: [
            { name: { contains: w.name, mode: "insensitive" } },
            ...(w.phone ? [{ phone: w.phone }] : []),
          ],
          country: w.country,
        },
      });

      if (existing) {
        // Update existing with new info if we have it
        await prisma.warehouse.update({
          where: { id: existing.id },
          data: {
            phone: existing.phone || w.phone,
            email: existing.email || w.email,
            website: existing.website || w.website,
            address: existing.address || w.address,
            rating: existing.rating || w.rating,
            lat: existing.lat || w.lat,
            lng: existing.lng || w.lng,
          },
        });
      } else {
        await prisma.warehouse.create({
          data: {
            name: w.name,
            address: w.address,
            city: w.city,
            country: w.country,
            freeZone: w.freeZone,
            phone: w.phone,
            email: w.email,
            website: w.website,
            lat: w.lat,
            lng: w.lng,
            rating: w.rating,
            source: w.source,
            sourceUrl: w.sourceUrl,
            tags: w.tags || [],
          },
        });
        saved++;
      }
    } catch (error) {
      // Skip individual failures
      console.error(`Failed to save warehouse "${w.name}":`, error);
    }
  }

  return saved;
}

// Log a scrape run
async function logScrape(
  source: string,
  country: string,
  count: number,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    await prisma.scrapeLog.create({
      data: { source, country, results: count, status: success ? "success" : "error", error },
    });
  } catch {
    // Don't fail if logging fails
  }
}

// ── Main scrape orchestrator ──

export async function runGooglePlacesScrape(apiKey: string): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  for (const country of ["UAE", "Qatar"] as const) {
    const start = Date.now();
    try {
      console.log(`\n🔍 Scraping Google Places: ${country}...`);
      const warehouses = await scrapeGooglePlaces(apiKey, country);
      const deduped = deduplicateWarehouses(warehouses);
      const saved = await saveWarehousesToDb(deduped, "google_places");
      const duration = Date.now() - start;

      console.log(`✅ Google Places ${country}: ${saved} new warehouses (${deduped.length} total)`);
      results.push({ source: "google_places", country, count: saved, success: true, duration });
      await logScrape("google_places", country, saved, true);
    } catch (error) {
      const duration = Date.now() - start;
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Google Places ${country} failed:`, msg);
      results.push({ source: "google_places", country, count: 0, success: false, error: msg, duration });
      await logScrape("google_places", country, 0, false, msg);
    }
  }

  return results;
}

export async function runDirectoryScrape(): Promise<ScrapeResult[]> {
  const start = Date.now();
  try {
    console.log("\n📂 Scraping business directories...");
    const warehouses = await scrapeAllDirectories();
    const deduped = deduplicateWarehouses(warehouses);
    const saved = await saveWarehousesToDb(deduped, "directories");
    const duration = Date.now() - start;

    await logScrape("directories", "UAE+Qatar", saved, true);
    return [{ source: "directories", country: "UAE+Qatar", count: saved, success: true, duration }];
  } catch (error) {
    const duration = Date.now() - start;
    const msg = error instanceof Error ? error.message : "Unknown error";
    await logScrape("directories", "UAE+Qatar", 0, false, msg);
    return [{ source: "directories", country: "UAE+Qatar", count: 0, success: false, error: msg, duration }];
  }
}

export async function runRealEstateScrape(): Promise<ScrapeResult[]> {
  const start = Date.now();
  try {
    console.log("\n🏢 Scraping real estate platforms...");
    const warehouses = await scrapeAllRealEstate();
    const deduped = deduplicateWarehouses(warehouses);
    const saved = await saveWarehousesToDb(deduped, "real_estate");
    const duration = Date.now() - start;

    await logScrape("real_estate", "UAE", saved, true);
    return [{ source: "real_estate", country: "UAE", count: saved, success: true, duration }];
  } catch (error) {
    const duration = Date.now() - start;
    const msg = error instanceof Error ? error.message : "Unknown error";
    await logScrape("real_estate", "UAE", 0, false, msg);
    return [{ source: "real_estate", country: "UAE", count: 0, success: false, error: msg, duration }];
  }
}

export async function runGoogleSearchScrape(): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  for (const country of ["UAE", "Qatar"] as const) {
    const start = Date.now();
    try {
      console.log(`\n🔎 Running Google Search discovery: ${country}...`);
      const { scrapeGoogleSearch } = await import("./google-search");
      const warehouses = await scrapeGoogleSearch(country);
      const deduped = deduplicateWarehouses(warehouses);
      const saved = await saveWarehousesToDb(deduped, "google_search");
      const duration = Date.now() - start;

      console.log(`✅ Google Search ${country}: ${saved} new warehouses`);
      results.push({ source: "google_search", country, count: saved, success: true, duration });
      await logScrape("google_search", country, saved, true);
    } catch (error) {
      const duration = Date.now() - start;
      const msg = error instanceof Error ? error.message : "Unknown error";
      results.push({ source: "google_search", country, count: 0, success: false, error: msg, duration });
      await logScrape("google_search", country, 0, false, msg);
    }
  }

  return results;
}

// Run ALL scrapers
export async function runAllScrapers(apiKey?: string): Promise<ScrapeResult[]> {
  const allResults: ScrapeResult[] = [];

  // Directories and real estate platforms don't need API keys
  allResults.push(...await runDirectoryScrape());
  allResults.push(...await runRealEstateScrape());
  allResults.push(...await runGoogleSearchScrape());

  // Google Places needs an API key
  if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
    allResults.push(...await runGooglePlacesScrape(apiKey));
  } else {
    console.log("\n⚠️  Skipping Google Places API (no API key configured)");
  }

  const totalNew = allResults.reduce((sum, r) => sum + r.count, 0);
  console.log(`\n🏁 Scraping complete! Total new warehouses saved: ${totalNew}`);

  return allResults;
}
