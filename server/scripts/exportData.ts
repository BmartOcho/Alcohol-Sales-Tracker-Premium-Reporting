import { db } from "../db";
import { monthlySales, establishments } from "@shared/schema";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

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
function convertToCSV<T extends Record<string, any>>(data: T[]): string {
  if (data.length === 0) {
    return "";
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  const headerRow = headers.map(escapeCsvField).join(",");
  
  // Create data rows
  const dataRows = data.map(row => 
    headers.map(header => escapeCsvField(row[header])).join(",")
  );
  
  return [headerRow, ...dataRows].join("\n");
}

async function exportData() {
  console.log("🚀 Starting data export...\n");
  
  try {
    // Create exports directory
    const exportDir = resolve(process.cwd(), "exports");
    mkdirSync(exportDir, { recursive: true });
    console.log(`✓ Created exports directory: ${exportDir}\n`);
    
    // Export monthly_sales table
    console.log("📊 Exporting monthly_sales table...");
    const monthlySalesData = await db.select().from(monthlySales);
    console.log(`   Found ${monthlySalesData.length} records`);
    
    const monthlySalesCsv = convertToCSV(monthlySalesData);
    const monthlySalesPath = resolve(exportDir, "monthly_sales_export.csv");
    writeFileSync(monthlySalesPath, monthlySalesCsv, "utf8");
    
    const monthlySalesSize = (Buffer.byteLength(monthlySalesCsv, "utf8") / 1024 / 1024).toFixed(2);
    console.log(`✅ Exported to: ${monthlySalesPath}`);
    console.log(`   File size: ${monthlySalesSize} MB\n`);
    
    // Export establishments table
    console.log("📊 Exporting establishments table...");
    const establishmentsData = await db.select().from(establishments);
    console.log(`   Found ${establishmentsData.length} records`);
    
    const establishmentsCsv = convertToCSV(establishmentsData);
    const establishmentsPath = resolve(exportDir, "establishments_export.csv");
    writeFileSync(establishmentsPath, establishmentsCsv, "utf8");
    
    const establishmentsSize = (Buffer.byteLength(establishmentsCsv, "utf8") / 1024 / 1024).toFixed(2);
    console.log(`✅ Exported to: ${establishmentsPath}`);
    console.log(`   File size: ${establishmentsSize} MB\n`);
    
    console.log("✨ Export complete!");
    console.log("\nExported files:");
    console.log(`  - ${monthlySalesPath} (${monthlySalesSize} MB)`);
    console.log(`  - ${establishmentsPath} (${establishmentsSize} MB)`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
}

// Run the export
exportData();
