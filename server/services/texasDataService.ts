import { type Establishment, type TexasDataRecord, texasDataRecordSchema } from "@shared/schema";

const TEXAS_API_BASE = "https://data.texas.gov/resource/naix-2893.json";
const GEOCODING_CACHE = new Map<string, { lat: number; lng: number }>();

const TEXAS_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "AUSTIN": { lat: 30.2672, lng: -97.7431 },
  "HOUSTON": { lat: 29.7604, lng: -95.3698 },
  "DALLAS": { lat: 32.7767, lng: -96.7970 },
  "SAN ANTONIO": { lat: 29.4241, lng: -98.4936 },
  "FORT WORTH": { lat: 32.7555, lng: -97.3308 },
  "EL PASO": { lat: 31.7619, lng: -106.4850 },
  "ARLINGTON": { lat: 32.7357, lng: -97.1081 },
  "CORPUS CHRISTI": { lat: 27.8006, lng: -97.3964 },
  "PLANO": { lat: 33.0198, lng: -96.6989 },
  "LUBBOCK": { lat: 33.5779, lng: -101.8552 },
};

function parseNumericValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

async function geocodeAddress(city: string, address: string): Promise<{ lat: number; lng: number }> {
  const cacheKey = `${city}-${address}`;
  
  if (GEOCODING_CACHE.has(cacheKey)) {
    return GEOCODING_CACHE.get(cacheKey)!;
  }

  const cityUpper = city.toUpperCase();
  if (TEXAS_CITY_COORDS[cityUpper]) {
    const baseCoords = TEXAS_CITY_COORDS[cityUpper];
    const offset = {
      lat: (Math.random() - 0.5) * 0.05,
      lng: (Math.random() - 0.5) * 0.05,
    };
    const coords = {
      lat: baseCoords.lat + offset.lat,
      lng: baseCoords.lng + offset.lng,
    };
    GEOCODING_CACHE.set(cacheKey, coords);
    return coords;
  }

  const defaultCoords = { lat: 31.9686, lng: -99.9018 };
  GEOCODING_CACHE.set(cacheKey, defaultCoords);
  return defaultCoords;
}

export async function fetchTexasAlcoholData(limit: number = 500): Promise<Establishment[]> {
  try {
    const url = `${TEXAS_API_BASE}?$limit=${limit}&$order=total_receipts DESC`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Texas API request failed: ${response.status}`);
    }

    const rawData = await response.json();
    
    const validatedRecords: TexasDataRecord[] = [];
    for (const record of rawData) {
      try {
        const validated = texasDataRecordSchema.parse(record);
        validatedRecords.push(validated);
      } catch (e) {
        console.warn("Skipping invalid record:", e);
      }
    }

    const establishments: Establishment[] = [];
    
    for (const record of validatedRecords) {
      const name = record.location_name || record.taxpayer_name || "Unknown";
      const address = record.location_address || record.taxpayer_address || "Unknown";
      const city = record.location_city || record.taxpayer_city || "Unknown";
      const county = record.location_county || record.taxpayer_county || "Unknown";
      const zipCode = record.location_zip || record.taxpayer_zip || "";

      if (name === "Unknown" || city === "Unknown") continue;

      const coords = await geocodeAddress(city, address);

      const totalSales = parseNumericValue(record.total_receipts);
      const liquorSales = parseNumericValue(record.liquor_receipts);
      const wineSales = parseNumericValue(record.wine_receipts);
      const beerSales = parseNumericValue(record.beer_receipts);

      if (totalSales <= 0) continue;

      establishments.push({
        id: `${name}-${city}-${record.obligation_end_date_yyyymmdd || Date.now()}`.replace(/\s+/g, '-'),
        name,
        address,
        city,
        county,
        zipCode,
        lat: coords.lat,
        lng: coords.lng,
        totalSales,
        liquorSales,
        wineSales,
        beerSales,
        obligationEndDate: record.obligation_end_date_yyyymmdd || "",
      });
    }

    return establishments;
  } catch (error) {
    console.error("Error fetching Texas alcohol data:", error);
    throw error;
  }
}
