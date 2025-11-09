import { db } from "../db";
import { monthlySales } from "@shared/schema";
import { fetchAllTexasAlcoholData } from "../services/texasDataService";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { pathToFileURL } from "url";
import { resolve } from "path";

export async function getLatestObligationDate(): Promise<Date | null> {
  const result = await db
    .select({ latestDate: monthlySales.obligationEndDate })
    .from(monthlySales)
    .orderBy(desc(monthlySales.obligationEndDate))
    .limit(1);
  
  return result.length > 0 ? result[0].latestDate : null;
}

export async function importIncrementalData(): Promise<{ imported: number; message: string; latestDate?: string }> {
  console.log("\n🔄 Starting incremental data update...");
  
  const latestDate = await getLatestObligationDate();
  
  if (!latestDate) {
    console.log("⚠️  No existing data found. Use full year import instead: tsx importData.ts 2025");
    return { imported: 0, message: "No existing data - run full import first" };
  }
  
  const latestDateStr = latestDate.toISOString().split('T')[0];
  console.log(`📅 Latest data in database: ${latestDateStr}`);
  
  // Start from the SAME date to catch any new records added for that date
  // onConflictDoNothing will skip duplicates thanks to uniqueness constraint
  const startDateStr = latestDateStr + 'T00:00:00.000';
  
  const now = new Date();
  const endDateStr = now.toISOString().split('T')[0] + 'T23:59:59.999';
  
  console.log(`📥 Fetching new records from ${startDateStr} to ${endDateStr}...`);
  
  const locations = await fetchAllTexasAlcoholData(Infinity, startDateStr, endDateStr);
  
  if (locations.length === 0) {
    console.log("✨ No new data available. Database is up to date!");
    return { imported: 0, message: "Database already up to date", latestDate: latestDateStr };
  }
  
  console.log(`✓ Fetched ${locations.length} locations with new monthly records`);
  
  const allMonthlyRecords = locations.flatMap(location => 
    location.monthlyRecords.map(record => ({
      permitNumber: record.permitNumber,
      locationName: record.locationName,
      locationAddress: record.locationAddress,
      locationCity: record.locationCity,
      locationCounty: record.locationCounty,
      locationZip: record.locationZip,
      taxpayerName: record.taxpayerName,
      obligationEndDate: new Date(record.obligationEndDate),
      liquorReceipts: record.liquorReceipts.toString(),
      wineReceipts: record.wineReceipts.toString(),
      beerReceipts: record.beerReceipts.toString(),
      coverChargeReceipts: record.coverChargeReceipts.toString(),
      totalReceipts: record.totalReceipts.toString(),
      lat: record.lat.toString(),
      lng: record.lng.toString(),
    }))
  );
  
  console.log(`📊 Total new monthly records to import: ${allMonthlyRecords.length}`);
  
  //  Get existing permit/date combinations to filter out duplicates
  const existingRecords = await db
    .select({
      permitNumber: monthlySales.permitNumber,
      obligationEndDate: monthlySales.obligationEndDate
    })
    .from(monthlySales)
    .where(
      and(
        gte(monthlySales.obligationEndDate, new Date(startDateStr)),
        lte(monthlySales.obligationEndDate, new Date(endDateStr))
      )
    );
  
  const existingKeys = new Set(
    existingRecords.map(r => `${r.permitNumber}|${r.obligationEndDate.toISOString()}`)
  );
  
  // Filter out records that already exist
  const newRecords = allMonthlyRecords.filter(record => {
    const key = `${record.permitNumber}|${record.obligationEndDate.toISOString()}`;
    return !existingKeys.has(key);
  });
  
  console.log(`📝 Found ${allMonthlyRecords.length - newRecords.length} duplicate records, importing ${newRecords.length} new records`);
  
  if (newRecords.length === 0) {
    console.log("✨ No new unique records to import!");
    return { imported: 0, message: "No new records found", latestDate: latestDateStr };
  }
  
  const batchSize = 1000;
  let importedCount = 0;
  
  for (let i = 0; i < newRecords.length; i += batchSize) {
    const batch = newRecords.slice(i, i + batchSize);
    await db.insert(monthlySales).values(batch);
    importedCount += batch.length;
    console.log(`   Inserted ${Math.min(i + batchSize, newRecords.length)}/${newRecords.length} records`);
  }
  
  console.log(`✅ Successfully imported ${importedCount} new records`);
  
  // Update establishments table with new/updated permit aggregations
  console.log("📊 Updating establishments table with new data...");
  const { establishments } = await import('@shared/schema');
  
  // Get unique permits from new records
  const affectedPermits = Array.from(new Set(newRecords.map(r => r.permitNumber)));
  console.log(`   Updating ${affectedPermits.length} establishments...`);
  
  // Recompute aggregates for affected permits and upsert
  for (const permitNumber of affectedPermits) {
    const aggregated = await db
      .select({
        permitNumber: monthlySales.permitNumber,
        locationName: sql<string>`MAX(${monthlySales.locationName})`,
        locationAddress: sql<string>`MAX(${monthlySales.locationAddress})`,
        locationCity: sql<string>`MAX(${monthlySales.locationCity})`,
        locationCounty: sql<string>`MAX(${monthlySales.locationCounty})`,
        locationZip: sql<string>`MAX(${monthlySales.locationZip})`,
        taxpayerName: sql<string>`MAX(${monthlySales.taxpayerName})`,
        lat: sql<string>`MAX(${monthlySales.lat})`,
        lng: sql<string>`MAX(${monthlySales.lng})`,
        totalSales: sql<string>`SUM(${monthlySales.totalReceipts})`,
        liquorSales: sql<string>`SUM(${monthlySales.liquorReceipts})`,
        wineSales: sql<string>`SUM(${monthlySales.wineReceipts})`,
        beerSales: sql<string>`SUM(${monthlySales.beerReceipts})`,
        latestMonth: sql<string>`MAX(${monthlySales.obligationEndDate})`,
      })
      .from(monthlySales)
      .where(eq(monthlySales.permitNumber, permitNumber))
      .groupBy(monthlySales.permitNumber);
    
    if (aggregated.length > 0) {
      const data = aggregated[0];
      await db.insert(establishments).values({
        permitNumber: data.permitNumber,
        locationName: data.locationName,
        locationAddress: data.locationAddress,
        locationCity: data.locationCity,
        locationCounty: data.locationCounty,
        locationZip: data.locationZip,
        taxpayerName: data.taxpayerName,
        lat: data.lat,
        lng: data.lng,
        totalSales: data.totalSales,
        liquorSales: data.liquorSales,
        wineSales: data.wineSales,
        beerSales: data.beerSales,
        latestMonth: new Date(data.latestMonth),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: establishments.permitNumber,
        set: {
          locationName: data.locationName,
          locationAddress: data.locationAddress,
          locationCity: data.locationCity,
          locationCounty: data.locationCounty,
          locationZip: data.locationZip,
          taxpayerName: data.taxpayerName,
          lat: data.lat,
          lng: data.lng,
          totalSales: data.totalSales,
          liquorSales: data.liquorSales,
          wineSales: data.wineSales,
          beerSales: data.beerSales,
          latestMonth: new Date(data.latestMonth),
          updatedAt: new Date(),
        }
      });
    }
  }
  console.log(`✓ Updated ${affectedPermits.length} establishments`);
  
  // Clear the cache so fresh data is immediately available
  console.log("🔄 Clearing location cache to refresh data...");
  const { storage } = await import("../storage");
  storage.clearCache();
  console.log("✓ Cache cleared - fresh data now available");
  
  const newLatestDate = await getLatestObligationDate();
  const newLatestDateStr = newLatestDate?.toISOString().split('T')[0] || latestDateStr;
  
  return { imported: importedCount, message: `Imported ${importedCount} new records`, latestDate: newLatestDateStr };
}

async function importDataForYear(year: number) {
  const startDate = `${year}-01-01T00:00:00.000`;
  const endDate = `${year}-12-31T23:59:59.999`;
  
  console.log(`\n📥 Fetching data for ${year}...`);
  const locations = await fetchAllTexasAlcoholData(Infinity, startDate, endDate);
  
  console.log(`✓ Fetched ${locations.length} locations with monthly records`);
  
  const allMonthlyRecords = locations.flatMap(location => 
    location.monthlyRecords.map(record => ({
      permitNumber: record.permitNumber,
      locationName: record.locationName,
      locationAddress: record.locationAddress,
      locationCity: record.locationCity,
      locationCounty: record.locationCounty,
      locationZip: record.locationZip,
      taxpayerName: record.taxpayerName,
      obligationEndDate: new Date(record.obligationEndDate),
      liquorReceipts: record.liquorReceipts.toString(),
      wineReceipts: record.wineReceipts.toString(),
      beerReceipts: record.beerReceipts.toString(),
      coverChargeReceipts: record.coverChargeReceipts.toString(),
      totalReceipts: record.totalReceipts.toString(),
      lat: record.lat.toString(),
      lng: record.lng.toString(),
    }))
  );
  
  console.log(`📊 Total monthly records to import: ${allMonthlyRecords.length}`);
  
  const startOfYear = new Date(`${year}-01-01`);
  const endOfYear = new Date(`${year}-12-31`);
  
  const existingCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(monthlySales)
    .where(
      and(
        gte(monthlySales.obligationEndDate, startOfYear),
        lte(monthlySales.obligationEndDate, endOfYear)
      )
    );
  
  if (existingCount[0]?.count > 0) {
    console.log(`⚠️  Found ${existingCount[0].count} existing records for ${year}`);
    console.log(`   Skipping import. Delete existing data first if you want to re-import.`);
    return;
  }
  
  const batchSize = 1000;
  for (let i = 0; i < allMonthlyRecords.length; i += batchSize) {
    const batch = allMonthlyRecords.slice(i, i + batchSize);
    await db.insert(monthlySales).values(batch);
    console.log(`   Inserted ${Math.min(i + batchSize, allMonthlyRecords.length)}/${allMonthlyRecords.length} records`);
  }
  
  console.log(`✅ Successfully imported ${allMonthlyRecords.length} records for ${year}`);
}

async function main() {
  const yearArg1 = process.argv[2];
  const yearArg2 = process.argv[3];
  
  if (yearArg1 === "update" || yearArg1 === "incremental") {
    try {
      const result = await importIncrementalData();
      console.log("\n✨ Incremental update complete!");
      process.exit(0);
    } catch (error) {
      console.error("❌ Incremental update failed:", error);
      process.exit(1);
    }
    return;
  }
  
  let years: number[];
  if (yearArg1 && yearArg2) {
    const start = parseInt(yearArg1);
    const end = parseInt(yearArg2);
    years = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  } else if (yearArg1) {
    years = [parseInt(yearArg1)];
  } else {
    years = [new Date().getFullYear()];
  }
  
  console.log("🚀 Starting data import from Texas Open Data Portal...\n");
  console.log(`Years to import: ${years.join(", ")}`);
  
  for (const year of years) {
    try {
      await importDataForYear(year);
    } catch (error) {
      console.error(`❌ Failed to import ${year}:`, error);
      console.log("Continuing with next year...");
    }
  }
  
  console.log("\n✨ Data import complete!");
  process.exit(0);
}

// Only run main() if this script is executed directly (not imported as a module)
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
