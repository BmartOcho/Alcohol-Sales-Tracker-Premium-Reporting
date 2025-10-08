import { type MonthlySalesRecord, type LocationSummary, type TexasDataRecord, texasDataRecordSchema } from "@shared/schema";

const TEXAS_API_BASE = "https://data.texas.gov/resource/naix-2893.json";
const GEOCODING_CACHE = new Map<string, { lat: number; lng: number }>();

const TEXAS_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "HOUSTON": { lat: 29.7604, lng: -95.3698 },
  "DALLAS": { lat: 32.7767, lng: -96.7970 },
  "SAN ANTONIO": { lat: 29.4241, lng: -98.4936 },
  "AUSTIN": { lat: 30.2672, lng: -97.7431 },
  "FORT WORTH": { lat: 32.7555, lng: -97.3308 },
  "EL PASO": { lat: 31.7619, lng: -106.4850 },
  "ARLINGTON": { lat: 32.7357, lng: -97.1081 },
  "CORPUS CHRISTI": { lat: 27.8006, lng: -97.3964 },
  "PLANO": { lat: 33.0198, lng: -96.6989 },
  "LUBBOCK": { lat: 33.5779, lng: -101.8552 },
  "IRVING": { lat: 32.8140, lng: -96.9489 },
  "LAREDO": { lat: 27.5306, lng: -99.4803 },
  "GARLAND": { lat: 32.9126, lng: -96.6389 },
  "FRISCO": { lat: 33.1507, lng: -96.8236 },
  "MCKINNEY": { lat: 33.1972, lng: -96.6397 },
};

function parseNumericValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function geocodeAddress(city: string): { lat: number; lng: number } {
  const cityUpper = city.toUpperCase();
  if (TEXAS_CITY_COORDS[cityUpper]) {
    const baseCoords = TEXAS_CITY_COORDS[cityUpper];
    const cacheKey = city;
    
    if (!GEOCODING_CACHE.has(cacheKey)) {
      const offset = {
        lat: (Math.random() - 0.5) * 0.03,
        lng: (Math.random() - 0.5) * 0.03,
      };
      GEOCODING_CACHE.set(cacheKey, {
        lat: baseCoords.lat + offset.lat,
        lng: baseCoords.lng + offset.lng,
      });
    }
    
    return GEOCODING_CACHE.get(cacheKey)!;
  }

  return { lat: 31.9686, lng: -99.9018 };
}

export async function fetchAllTexasAlcoholData(maxRecords: number = 50000): Promise<LocationSummary[]> {
  try {
    const batchSize = 10000;
    let offset = 0;
    let allRecords: TexasDataRecord[] = [];
    
    console.log("Fetching Texas alcohol sales data...");
    
    while (offset < maxRecords) {
      const url = `${TEXAS_API_BASE}?$limit=${batchSize}&$offset=${offset}&$order=obligation_end_date_yyyymmdd DESC`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Texas API request failed: ${response.status}`);
      }

      const rawData = await response.json();
      
      if (rawData.length === 0) {
        break;
      }

      for (const record of rawData) {
        try {
          const validated = texasDataRecordSchema.parse(record);
          allRecords.push(validated);
        } catch (e) {
          // Skip invalid records
        }
      }

      console.log(`Fetched ${allRecords.length} records so far...`);
      
      if (rawData.length < batchSize) {
        break;
      }
      
      offset += batchSize;
    }

    console.log(`Total records fetched: ${allRecords.length}`);

    // Group by permit number (location)
    const locationMap = new Map<string, {
      monthlyRecords: MonthlySalesRecord[];
      locationInfo: {
        name: string;
        address: string;
        city: string;
        county: string;
        zip: string;
        taxpayerName: string;
      };
    }>();

    for (const record of allRecords) {
      const permitNumber = record.tabc_permit_number || "";
      const locationName = record.location_name || record.taxpayer_name || "Unknown";
      const locationCity = record.location_city || record.taxpayer_city || "Unknown";
      
      if (!permitNumber || locationName === "Unknown") continue;

      const totalReceipts = parseNumericValue(record.total_receipts);
      if (totalReceipts <= 0) continue;

      const coords = geocodeAddress(locationCity);

      const monthlyRecord: MonthlySalesRecord = {
        permitNumber,
        locationName,
        locationAddress: record.location_address || record.taxpayer_address || "Unknown",
        locationCity,
        locationCounty: record.location_county || record.taxpayer_county || "Unknown",
        locationZip: record.location_zip || record.taxpayer_zip || "",
        taxpayerName: record.taxpayer_name || locationName,
        obligationEndDate: record.obligation_end_date_yyyymmdd || "",
        liquorReceipts: parseNumericValue(record.liquor_receipts),
        wineReceipts: parseNumericValue(record.wine_receipts),
        beerReceipts: parseNumericValue(record.beer_receipts),
        coverChargeReceipts: parseNumericValue(record.cover_charge_receipts),
        totalReceipts,
        lat: coords.lat,
        lng: coords.lng,
      };

      if (!locationMap.has(permitNumber)) {
        locationMap.set(permitNumber, {
          monthlyRecords: [],
          locationInfo: {
            name: locationName,
            address: record.location_address || record.taxpayer_address || "Unknown",
            city: locationCity,
            county: record.location_county || record.taxpayer_county || "Unknown",
            zip: record.location_zip || record.taxpayer_zip || "",
            taxpayerName: record.taxpayer_name || locationName,
          },
        });
      }

      locationMap.get(permitNumber)!.monthlyRecords.push(monthlyRecord);
    }

    // Convert to LocationSummary array
    const locations: LocationSummary[] = [];
    
    for (const [permitNumber, data] of Array.from(locationMap.entries())) {
      const monthlyRecords = data.monthlyRecords.sort((a: MonthlySalesRecord, b: MonthlySalesRecord) => 
        b.obligationEndDate.localeCompare(a.obligationEndDate)
      );

      const totalSales = monthlyRecords.reduce((sum: number, r: MonthlySalesRecord) => sum + r.totalReceipts, 0);
      const liquorSales = monthlyRecords.reduce((sum: number, r: MonthlySalesRecord) => sum + r.liquorReceipts, 0);
      const wineSales = monthlyRecords.reduce((sum: number, r: MonthlySalesRecord) => sum + r.wineReceipts, 0);
      const beerSales = monthlyRecords.reduce((sum: number, r: MonthlySalesRecord) => sum + r.beerReceipts, 0);

      const firstRecord = monthlyRecords[0];

      locations.push({
        permitNumber,
        locationName: data.locationInfo.name,
        locationAddress: data.locationInfo.address,
        locationCity: data.locationInfo.city,
        locationCounty: data.locationInfo.county,
        locationZip: data.locationInfo.zip,
        lat: firstRecord.lat,
        lng: firstRecord.lng,
        totalSales,
        liquorSales,
        wineSales,
        beerSales,
        latestMonth: firstRecord.obligationEndDate,
        monthlyRecords,
      });
    }

    console.log(`Processed ${locations.length} unique locations`);
    return locations.sort((a, b) => b.totalSales - a.totalSales);
    
  } catch (error) {
    console.error("Error fetching Texas alcohol data:", error);
    throw error;
  }
}
