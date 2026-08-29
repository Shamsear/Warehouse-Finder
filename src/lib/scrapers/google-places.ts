import { WarehouseData } from "../types";

const GOOGLE_PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

interface PlacesSearchResult {
  results: {
    name: string;
    formatted_address?: string;
    geometry?: { location: { lat: number; lng: number } };
    place_id: string;
    rating?: number;
    types?: string[];
    vicinity?: string;
    opening_hours?: { open_now?: boolean };
  }[];
  next_page_token?: string;
  status: string;
}

interface PlaceDetailsResult {
  result: {
    name: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    url?: string;
    geometry?: { location: { lat: number; lng: number } };
    rating?: number;
    reviews?: unknown[];
    types?: string[];
    business_status?: string;
  };
  status: string;
}

// UAE cities to search
const UAE_SEARCH_QUERIES = [
  "warehouse Dubai",
  "logistics warehouse Dubai",
  "storage facility Dubai",
  "warehousing Jebel Ali",
  "warehouse Abu Dhabi",
  "logistics warehouse Abu Dhabi",
  "warehouse Sharjah",
  "industrial warehouse Sharjah",
  "warehouse Ajman",
  "warehouse Ras Al Khaimah",
  "warehouse Umm Al Quwain",
  "warehouse Fujairah",
  "3PL warehouse Dubai",
  "cold storage warehouse Dubai",
  "distribution center Dubai",
];

const QATAR_SEARCH_QUERIES = [
  "warehouse Doha",
  "logistics warehouse Doha",
  "storage facility Doha",
  "warehousing Qatar",
  "warehouse Al Wakrah",
  "warehouse Mesaieed",
  "logistics company Doha",
  "distribution center Doha",
  "cold storage Qatar",
  "3PL warehouse Qatar",
];

function getCityFromAddress(address: string, country: "UAE" | "Qatar"): string | undefined {
  const uaeCities = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Ras al Khaimah", "Umm Al Quwain", "Fujairah"];
  const qatarCities = ["Doha", "Al Wakrah", "Mesaieed", "Al Khor", "Dukhan"];

  const cities = country === "UAE" ? uaeCities : qatarCities;
  for (const city of cities) {
    if (address.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }
  return undefined;
}

async function searchPlaces(
  query: string,
  apiKey: string,
  country: "UAE" | "Qatar",
  pageToken?: string
): Promise<PlacesSearchResult> {
  let url = `${GOOGLE_PLACES_BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  if (pageToken) {
    url += `&pagetoken=${pageToken}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }
  return response.json();
}

async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<PlaceDetailsResult> {
  const url = `${GOOGLE_PLACES_BASE}/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,url,geometry,rating,types,business_status&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }
  return response.json();
}

export async function scrapeGooglePlaces(
  apiKey: string,
  country: "UAE" | "Qatar"
): Promise<WarehouseData[]> {
  const queries = country === "UAE" ? UAE_SEARCH_QUERIES : QATAR_SEARCH_QUERIES;
  const warehouses: WarehouseData[] = [];
  const seenPlaceIds = new Set<string>();

  for (const query of queries) {
    console.log(`  Searching: ${query}`);
    let pageToken: string | undefined;
    let pageNum = 0;

    do {
      try {
        const result = await searchPlaces(query, apiKey, country, pageToken);

        if (result.status !== "OK" && result.status !== "ZERO_RESULTS") {
          console.warn(`  API returned status: ${result.status} for query: ${query}`);
          break;
        }

        for (const place of result.results) {
          if (seenPlaceIds.has(place.place_id)) continue;
          seenPlaceIds.add(place.place_id);

          // Get detailed info including phone/website
          let details: PlaceDetailsResult | null = null;
          try {
            details = await getPlaceDetails(place.place_id, apiKey);
          } catch {
            // Use basic info if details fail
          }

          const detail = details?.result;
          const phone = detail?.international_phone_number || detail?.formatted_phone_number || undefined;

          warehouses.push({
            name: detail?.name || place.name,
            address: detail?.formatted_address || place.formatted_address || place.vicinity,
            city: getCityFromAddress(detail?.formatted_address || place.formatted_address || "", country),
            country,
            phone,
            website: detail?.website,
            lat: detail?.geometry?.location.lat || place.geometry?.location.lat,
            lng: detail?.geometry?.location.lng || place.geometry?.location.lng,
            rating: detail?.rating || place.rating,
            source: "google_places",
            sourceUrl: detail?.url || `https://maps.google.com/?place_id=${place.place_id}`,
          });
        }

        pageToken = result.next_page_token;
        pageNum++;

        // Google requires a delay before using next_page_token
        if (pageToken) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`  Error searching "${query}":`, error);
        break;
      }
    } while (pageToken && pageNum < 3); // Max 3 pages per query
  }

  return warehouses;
}
