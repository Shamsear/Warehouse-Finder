import { WarehouseData } from "./types";

// Normalize a phone number to digits only with country prefix
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // UAE numbers: +971...
  if (digits.startsWith("971")) return "+" + digits;
  if (digits.startsWith("05") || digits.startsWith("04") || digits.startsWith("06")) {
    return "+971" + digits.slice(1);
  }
  
  // Qatar numbers: +974...
  if (digits.startsWith("974")) return "+" + digits;
  if (digits.startsWith("5") && digits.length === 8) {
    return "+974" + digits;
  }
  
  // Already has country code
  if (digits.startsWith("+")) return digits;
  
  return "+" + digits;
}

// Normalize warehouse name for comparison
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")  // remove special chars
    .replace(/\s+/g, " ")          // collapse whitespace
    .replace(/\b(llc|ltd|co|company|est|group|trading|trd|wh|warehouse|warehousing|logistics|storage|freight|cargo)\b/g, "")
    .trim();
}

// Generate a dedup key from name + phone
export function dedupKey(warehouse: WarehouseData): string {
  const name = normalizeName(warehouse.name);
  const phone = normalizePhone(warehouse.phone) || "";
  return `${name}|||${phone}`;
}

// Merge two warehouse records, preferring non-null values from the new one
export function mergeWarehouseData(
  existing: WarehouseData,
  incoming: WarehouseData
): WarehouseData {
  return {
    name: existing.name || incoming.name,
    address: existing.address || incoming.address,
    city: existing.city || incoming.city,
    country: existing.country || incoming.country,
    freeZone: existing.freeZone || incoming.freeZone,
    phone: existing.phone || incoming.phone,
    email: existing.email || incoming.email,
    website: existing.website || incoming.website,
    lat: existing.lat || incoming.lat,
    lng: existing.lng || incoming.lng,
    rating: existing.rating || incoming.rating,
    source: existing.source, // keep original source
    sourceUrl: existing.sourceUrl || incoming.sourceUrl,
    tags: [...new Set([...(existing.tags || []), ...(incoming.tags || [])])],
  };
}

// Deduplicate a list of warehouses
export function deduplicateWarehouses(warehouses: WarehouseData[]): WarehouseData[] {
  const seen = new Map<string, WarehouseData>();

  for (const warehouse of warehouses) {
    const key = dedupKey(warehouse);
    const existing = seen.get(key);

    if (existing) {
      seen.set(key, mergeWarehouseData(existing, warehouse));
    } else {
      seen.set(key, warehouse);
    }
  }

  return Array.from(seen.values());
}
