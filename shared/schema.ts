import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, timestamp, index, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (Required for Replit Auth - from blueprint:javascript_log_in_with_replit)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (Updated for Replit Auth - from blueprint:javascript_log_in_with_replit)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Subscription fields for future Stripe integration
  subscriptionStatus: varchar("subscription_status").default('free'), // 'free', 'active', 'canceled', 'past_due'
  subscriptionTier: varchar("subscription_tier").default('free'), // 'free', 'pro', 'enterprise'
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table for storing monthly alcohol sales records from Texas API
export const monthlySales = pgTable("monthly_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  permitNumber: text("permit_number").notNull(),
  locationName: text("location_name").notNull(),
  locationAddress: text("location_address").notNull(),
  locationCity: text("location_city").notNull(),
  locationCounty: text("location_county").notNull(),
  locationZip: text("location_zip").notNull(),
  taxpayerName: text("taxpayer_name").notNull(),
  obligationEndDate: timestamp("obligation_end_date").notNull(),
  liquorReceipts: numeric("liquor_receipts").notNull(),
  wineReceipts: numeric("wine_receipts").notNull(),
  beerReceipts: numeric("beer_receipts").notNull(),
  coverChargeReceipts: numeric("cover_charge_receipts").notNull(),
  totalReceipts: numeric("total_receipts").notNull(),
  lat: numeric("lat").notNull(),
  lng: numeric("lng").notNull(),
}, (table) => ({
  permitIdx: index("permit_idx").on(table.permitNumber),
  dateIdx: index("date_idx").on(table.obligationEndDate),
  countyIdx: index("county_idx").on(table.locationCounty),
}));

// User schemas for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertMonthlySalesSchema = createInsertSchema(monthlySales).omit({
  id: true,
});

export type InsertMonthlySales = z.infer<typeof insertMonthlySalesSchema>;
export type MonthlySalesDB = typeof monthlySales.$inferSelect;

export const monthlySalesRecordSchema = z.object({
  permitNumber: z.string(),
  locationName: z.string(),
  locationAddress: z.string(),
  locationCity: z.string(),
  locationCounty: z.string(),
  locationZip: z.string(),
  taxpayerName: z.string(),
  obligationEndDate: z.string(),
  liquorReceipts: z.number(),
  wineReceipts: z.number(),
  beerReceipts: z.number(),
  coverChargeReceipts: z.number(),
  totalReceipts: z.number(),
  lat: z.number(),
  lng: z.number(),
});

export type MonthlySalesRecord = z.infer<typeof monthlySalesRecordSchema>;

export const locationSummarySchema = z.object({
  permitNumber: z.string(),
  locationName: z.string(),
  locationAddress: z.string(),
  locationCity: z.string(),
  locationCounty: z.string(),
  locationZip: z.string(),
  lat: z.number(),
  lng: z.number(),
  totalSales: z.number(),
  liquorSales: z.number(),
  wineSales: z.number(),
  beerSales: z.number(),
  latestMonth: z.string(),
  monthlyRecords: z.array(monthlySalesRecordSchema),
});

export type LocationSummary = z.infer<typeof locationSummarySchema>;

export const texasDataRecordSchema = z.object({
  taxpayer_number: z.string().optional(),
  taxpayer_name: z.string().optional(),
  taxpayer_address: z.string().optional(),
  taxpayer_city: z.string().optional(),
  taxpayer_county: z.string().optional(),
  taxpayer_zip: z.string().optional(),
  location_number: z.string().optional(),
  location_name: z.string().optional(),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_county: z.string().optional(),
  location_zip: z.string().optional(),
  tabc_permit_number: z.string().optional(),
  obligation_end_date_yyyymmdd: z.string().optional(),
  liquor_receipts: z.string().optional(),
  wine_receipts: z.string().optional(),
  beer_receipts: z.string().optional(),
  cover_charge_receipts: z.string().optional(),
  total_receipts: z.string().optional(),
});

export type TexasDataRecord = z.infer<typeof texasDataRecordSchema>;

export const countySalesSchema = z.object({
  countyName: z.string(),
  totalSales: z.number(),
  liquorSales: z.number(),
  wineSales: z.number(),
  beerSales: z.number(),
  locationCount: z.number(),
  locations: z.array(locationSummarySchema),
});

export type CountySales = z.infer<typeof countySalesSchema>;
