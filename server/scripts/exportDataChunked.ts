import { db } from "../db";
import { monthlySales } from "@shared/schema";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { sql } from "drizzle-orm";

// Helper function to escape CSV fields
function escapeCsvField(field: any): string {
  if (field === null || field === undefined) {
    return "";
  }
  
  const str = String(field);
  
  // If field contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

// Convert array of objects to CSV string
function convertToCSV<T extends Record<string, any>>(data: T[], includeHeader: boolean = true): string {
  if (data.length === 0) {
    return "";
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create data rows
  const dataRows = data.map(row => 
    headers.map(header => escapeCsvField(row[header])).join(",")
  );
  
  if (includeHeader) {
    const headerRow = headers.map(escapeCsvField).join(",");
    return [headerRow, ...dataRows].join("\n");
  }
  
  return dataRows.join("\n");
}

async function exportMonthlyDataInChunks() {
  console.log("🚀 Starting chunked data export...\n");
  
  try {
    // Create exports directory
    const exportDir = resolve(process.cwd(), "exports");
    mkdirSync(exportDir, { recursive: true });
    console.log(`✓ Created exports directory: ${exportDir}\n`);
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(monthlySales);
    const totalRecords = countResult[0]?.count || 0;
    console.log(`📊 Total monthly_sales records: ${totalRecords}`);
    
    // Split into chunks of 100,000 records each (~25 MB per file)
    const chunkSize = 100000;
    const totalChunks = Math.ceil(totalRecords / chunkSize);
    console.log(`📦 Will create ${totalChunks} chunk files\n`);
    
    for (let chunkNum = 0; chunkNum < totalChunks; chunkNum++) {
      const offset = chunkNum * chunkSize;
      console.log(`Processing chunk ${chunkNum + 1}/${totalChunks}...`);
      
      // Fetch chunk from database
      const chunkData = await db
        .select()
        .from(monthlySales)
        .limit(chunkSize)
        .offset(offset);
      
      console.log(`   Fetched ${chunkData.length} records`);
      
      // Convert to CSV (include header only in first chunk)
      const csv = convertToCSV(chunkData, chunkNum === 0);
      
      // Write to file
      const filename = `monthly_sales_part${chunkNum + 1}_of_${totalChunks}.csv`;
      const filepath = resolve(exportDir, filename);
      writeFileSync(filepath, csv, "utf8");
      
      const fileSize = (Buffer.byteLength(csv, "utf8") / 1024 / 1024).toFixed(2);
      console.log(`✅ Saved ${filename} (${fileSize} MB)\n`);
    }
    
    console.log("✨ Chunked export complete!");
    console.log(`\nCreated ${totalChunks} files in ${exportDir}`);
    console.log("\nTo combine them on your local machine:");
    console.log("  # On Mac/Linux:");
    console.log("  cat monthly_sales_part*.csv > monthly_sales_complete.csv");
    console.log("\n  # On Windows PowerShell:");
    console.log("  Get-Content monthly_sales_part*.csv | Set-Content monthly_sales_complete.csv");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
}

// Run the export
exportMonthlyDataInChunks();
