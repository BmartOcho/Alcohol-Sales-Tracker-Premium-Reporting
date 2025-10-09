import { db } from "../db";
import { monthlySales } from "@shared/schema";
import { fetchAllTexasAlcoholData } from "../services/texasDataService";
import { eq, and, gte, lte, sql } from "drizzle-orm";

async function importDataForYear(year: number) {
  const startDate = `${year}-01-01T00:00:00.000`;
  const endDate = `${year}-12-31T23:59:59.999`;
  
  console.log(`\n📥 Fetching data for ${year}...`);
  const locations = await fetchAllTexasAlcoholData(Infinity, startDate, endDate);
  
  console.log(`✓ Fetched ${locations.length} locations with monthly records`);
  
  // Flatten all monthly records from all locations
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
  
  // Check if data for this year already exists
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
  
  // Insert in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < allMonthlyRecords.length; i += batchSize) {
    const batch = allMonthlyRecords.slice(i, i + batchSize);
    await db.insert(monthlySales).values(batch);
    console.log(`   Inserted ${Math.min(i + batchSize, allMonthlyRecords.length)}/${allMonthlyRecords.length} records`);
  }
  
  console.log(`✅ Successfully imported ${allMonthlyRecords.length} records for ${year}`);
}

async function main() {
  // Get year from command line argument or default to current year
  const yearArg = process.argv[2];
  const years = yearArg ? [parseInt(yearArg)] : [2024];
  
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

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
