import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const establishmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  county: z.string(),
  zipCode: z.string(),
  lat: z.number(),
  lng: z.number(),
  totalSales: z.number(),
  liquorSales: z.number(),
  wineSales: z.number(),
  beerSales: z.number(),
  obligationEndDate: z.string(),
});

export type Establishment = z.infer<typeof establishmentSchema>;

export const texasDataRecordSchema = z.object({
  taxpayer_name: z.string().optional(),
  taxpayer_address: z.string().optional(),
  taxpayer_city: z.string().optional(),
  taxpayer_county: z.string().optional(),
  taxpayer_zip: z.string().optional(),
  location_name: z.string().optional(),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_county: z.string().optional(),
  location_zip: z.string().optional(),
  obligation_end_date_yyyymmdd: z.string().optional(),
  liquor_receipts: z.string().optional(),
  wine_receipts: z.string().optional(),
  beer_receipts: z.string().optional(),
  total_receipts: z.string().optional(),
});

export type TexasDataRecord = z.infer<typeof texasDataRecordSchema>;
