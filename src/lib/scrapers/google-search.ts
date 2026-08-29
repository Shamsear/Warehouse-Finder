import * as cheerio from "cheerio";
import { WarehouseData } from "../types";

// Google Search queries targeting warehouses in UAE & Qatar
const SEARCH_QUERIES_UAE = [
  "logistics company Dubai contact number phone",
  "warehouse rental Dubai phone number",
  "warehousing company Abu Dhabi contact",
  "3PL provider UAE phone email",
  "cold storage company Dubai contact",
  "distribution center Dubai phone",
  "freight forwarding warehouse Dubai",
  "cargo warehouse Jebel Ali contact",
  "industrial warehouse Sharjah phone",
  "logistics company Ajman contact",
  "warehouse supplier Ras Al Khaimah",
  "storage company UAE contact details",
];

const SEARCH_QUERIES_QATAR = [
  "logistics company Doha contact number",
  "warehouse Qatar phone email",
  "warehousing Doha contact",
  "3PL provider Qatar phone",
  "cold storage company Doha contact",
  "freight forwarding warehouse Doha",
  "cargo warehouse Qatar contact",
  "logistics company Al Wakrah phone",
  "distribution center Qatar contact",
  "storage company Doha phone number",
];

function getCityFromQuery(query: string): string {
  if (query.toLowerCase().includes("dubai")) return "Dubai";
  if (query.toLowerCase().includes("abu dhabi")) return "Abu Dhabi";
  if (query.toLowerCase().includes("sharjah")) return "Sharjah";
  if (query.toLowerCase().includes("ajman")) return "Ajman";
  if (query.toLowerCase().includes("ras al khaimah") || query.toLowerCase().includes("rak")) return "Ras Al Khaimah";
  if (query.toLowerCase().includes("doha")) return "Doha";
  if (query.toLowerCase().includes("al wakrah")) return "Al Wakrah";
  if (query.toLowerCase().includes("qatar")) return "Doha";
  return "Dubai";
}

// Parse phone numbers from text
function extractPhones(text: string): string[] {
  const phoneRegex = /(?:\+971[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}|\+974[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}|05[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}|04[\s-]?\d[\s-]?\d{3}[\s-]?\d{4})/g;
  return text.match(phoneRegex) || [];
}

// Parse emails from text
function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.match(emailRegex) || [];
}

async function searchGoogle(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.google.com/search?q=${encodedQuery}&num=20&hl=en`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) return [];
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const results: { title: string; url: string; snippet: string }[] = [];

    // Parse Google search results
    $("div.g, div[data-sokoban-container]").each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find("h3").first();
      const linkEl = $el.find("a").first();
      const snippetEl = $el.find(".VwiC3b, .s, .st, span.aCOpRe").first();

      const title = titleEl.text().trim();
      const href = linkEl.attr("href") || "";
      const snippet = snippetEl.text().trim();

      if (title && href.startsWith("http") && !href.includes("google.com")) {
        results.push({ title, url: href, snippet });
      }
    });

    return results;
  } catch (error) {
    console.error(`Google search failed for "${query}":`, error);
    return [];
  }
}

async function scrapeSearchResult(url: string): Promise<Partial<WarehouseData>> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return {};

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove scripts and styles
    $("script, style, noscript, nav, footer, header").remove();
    
    const pageText = $("body").text();
    const phones = extractPhones(pageText);
    const emails = extractEmails(pageText);
    
    // Try to find the company name from the page
    const companyName = $("h1").first().text().trim() || 
                        $("title").text().split(/[|\-–]/)[0].trim() ||
                        undefined;

    // Try to find address
    const addressEl = $("[itemprop='address'], .address, .location, address").first();
    const address = addressEl.text().trim() || undefined;

    // Try to find website from meta tags
    const website = $("link[rel='canonical']").attr("href") || url;

    return {
      name: companyName,
      address,
      phone: phones[0],
      email: emails[0],
      website,
    };
  } catch {
    return {};
  }
}

export async function scrapeGoogleSearch(
  country: "UAE" | "Qatar"
): Promise<WarehouseData[]> {
  const queries = country === "UAE" ? SEARCH_QUERIES_UAE : SEARCH_QUERIES_QATAR;
  const warehouses: WarehouseData[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    console.log(`  Searching: ${query}`);
    
    const results = await searchGoogle(query);
    
    for (const result of results) {
      if (seenUrls.has(result.url)) continue;
      seenUrls.add(result.url);
      
      // Scrape the actual page for contact details
      const details = await scrapeSearchResult(result.url);
      
      if (details.name || details.phone || details.email) {
        warehouses.push({
          name: details.name || result.title,
          city: getCityFromQuery(query),
          country,
          address: details.address,
          phone: details.phone,
          email: details.email,
          website: details.website || result.url,
          source: "google_search",
          sourceUrl: result.url,
        });
      }
    }

    // Delay between searches to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return warehouses;
}

export async function scrapeAllGoogleSearch(): Promise<WarehouseData[]> {
  console.log("Starting Google Search discovery...");
  
  const [uaeResults, qatarResults] = await Promise.allSettled([
    scrapeGoogleSearch("UAE"),
    scrapeGoogleSearch("Qatar"),
  ]);

  const allWarehouses: WarehouseData[] = [];

  if (uaeResults.status === "fulfilled") allWarehouses.push(...uaeResults.value);
  if (qatarResults.status === "fulfilled") allWarehouses.push(...qatarResults.value);

  console.log(`Total from Google Search: ${allWarehouses.length}`);
  return allWarehouses;
}
