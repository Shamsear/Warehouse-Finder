import { NextRequest, NextResponse } from "next/server";
import { runAllScrapers, runGooglePlacesScrape, runDirectoryScrape, runRealEstateScrape, runGoogleSearchScrape } from "@/lib/scrapers";
import { prisma } from "@/lib/prisma";

// POST /api/scrape — Trigger a scrape run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const source = body.source || "all";
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    let results;

    switch (source) {
      case "google_places":
        results = await runGooglePlacesScrape(apiKey || "");
        break;
      case "directories":
        results = await runDirectoryScrape();
        break;
      case "real_estate":
        results = await runRealEstateScrape();
        break;
      case "google_search":
        results = await runGoogleSearchScrape();
        break;
      case "all":
      default:
        results = await runAllScrapers(apiKey);
        break;
    }

    const totalNew = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      success: true,
      totalNew,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/scrape — Get scrape logs
export async function GET() {
  try {
    const logs = await prisma.scrapeLog.findMany({
      orderBy: { runAt: "desc" },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
