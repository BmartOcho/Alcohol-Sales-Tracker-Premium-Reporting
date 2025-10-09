import { type User, type InsertUser, type LocationSummary, type MonthlySalesRecord } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getLocations(startDate?: string, endDate?: string): Promise<LocationSummary[]>;
  getLocationByPermit(permitNumber: string): Promise<LocationSummary | null>;
  getCachedLocations(cacheKey?: string): LocationSummary[] | null;
  setCachedLocations(locations: LocationSummary[], cacheKey?: string): void;
  clearCache(): void;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private locationCaches: Map<string, { data: LocationSummary[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour cache for large dataset

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getLocations(startDate?: string, endDate?: string): Promise<LocationSummary[]> {
    const cacheKey = startDate && endDate ? `${startDate}_${endDate}` : 'default';
    const cache = this.locationCaches.get(cacheKey);
    const now = Date.now();
    if (cache && (now - cache.timestamp) < this.CACHE_TTL) {
      return cache.data;
    }
    return [];
  }

  async getLocationByPermit(permitNumber: string): Promise<LocationSummary | null> {
    // MemStorage doesn't have data, return null
    return null;
  }

  getCachedLocations(cacheKey: string = 'default'): LocationSummary[] | null {
    const cache = this.locationCaches.get(cacheKey);
    const now = Date.now();
    if (cache && (now - cache.timestamp) < this.CACHE_TTL) {
      return cache.data;
    }
    return null;
  }

  setCachedLocations(locations: LocationSummary[], cacheKey: string = 'default'): void {
    this.locationCaches.set(cacheKey, {
      data: locations,
      timestamp: Date.now()
    });
  }

  clearCache(): void {
    this.locationCaches.clear();
    console.log('MemStorage: Cleared all location caches');
  }
}

import { db } from "./db";
import { monthlySales, users } from "@shared/schema";
import { and, between, eq, desc, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  private locationCache: Map<string, { data: LocationSummary[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour cache for all database queries

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getLocations(startDate?: string, endDate?: string): Promise<LocationSummary[]> {
    const cacheKey = startDate && endDate ? `${startDate}_${endDate}` : 'all';
    const cached = this.locationCache.get(cacheKey);
    const now = Date.now();
    
    // Check cache (1 hour TTL for all years)
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log(`✨ Cache hit - returning ${cached.data.length} locations from memory`);
      return cached.data;
    }
    
    console.log('Cache miss - querying database with SQL aggregation...');
    
    // Build WHERE clause for date filtering
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Step 1: Use SQL aggregation to get location summaries (FAST)
    const aggregationQuery = db
      .select({
        permitNumber: monthlySales.permitNumber,
        locationName: monthlySales.locationName,
        locationAddress: monthlySales.locationAddress,
        locationCity: monthlySales.locationCity,
        locationCounty: monthlySales.locationCounty,
        locationZip: monthlySales.locationZip,
        lat: monthlySales.lat,
        lng: monthlySales.lng,
        totalSales: sql<string>`SUM(${monthlySales.totalReceipts})::text`,
        liquorSales: sql<string>`SUM(${monthlySales.liquorReceipts})::text`,
        wineSales: sql<string>`SUM(${monthlySales.wineReceipts})::text`,
        beerSales: sql<string>`SUM(${monthlySales.beerReceipts})::text`,
        latestMonth: sql<string>`MAX(${monthlySales.obligationEndDate})::text`,
      })
      .from(monthlySales);
    
    // Apply date filter if provided
    if (start && end) {
      aggregationQuery.where(and(
        sql`${monthlySales.obligationEndDate} >= ${start}`,
        sql`${monthlySales.obligationEndDate} <= ${end}`
      ));
    }
    
    const aggregatedLocations = await aggregationQuery
      .groupBy(
        monthlySales.permitNumber,
        monthlySales.locationName,
        monthlySales.locationAddress,
        monthlySales.locationCity,
        monthlySales.locationCounty,
        monthlySales.locationZip,
        monthlySales.lat,
        monthlySales.lng
      );
    
    // Step 2: Fetch monthly records with same date filter (simple WHERE clause, no = ANY limit)
    const allMonthlyRecords = start && end
      ? await db
          .select()
          .from(monthlySales)
          .where(and(
            sql`${monthlySales.obligationEndDate} >= ${start}`,
            sql`${monthlySales.obligationEndDate} <= ${end}`
          ))
          .orderBy(desc(monthlySales.obligationEndDate))
      : await db
          .select()
          .from(monthlySales)
          .orderBy(desc(monthlySales.obligationEndDate));
    
    // Step 3: Group monthly records by permit number
    const monthlyRecordsMap = new Map<string, MonthlySalesRecord[]>();
    for (const record of allMonthlyRecords) {
      if (!monthlyRecordsMap.has(record.permitNumber)) {
        monthlyRecordsMap.set(record.permitNumber, []);
      }
      monthlyRecordsMap.get(record.permitNumber)!.push({
        permitNumber: record.permitNumber,
        locationName: record.locationName,
        locationAddress: record.locationAddress,
        locationCity: record.locationCity,
        locationCounty: record.locationCounty,
        locationZip: record.locationZip,
        taxpayerName: record.taxpayerName,
        obligationEndDate: record.obligationEndDate.toISOString(),
        liquorReceipts: parseFloat(record.liquorReceipts),
        wineReceipts: parseFloat(record.wineReceipts),
        beerReceipts: parseFloat(record.beerReceipts),
        coverChargeReceipts: parseFloat(record.coverChargeReceipts),
        totalReceipts: parseFloat(record.totalReceipts),
        lat: parseFloat(record.lat),
        lng: parseFloat(record.lng),
      });
    }
    
    // Step 4: Combine aggregated data with monthly records
    const locations: LocationSummary[] = aggregatedLocations.map(loc => ({
      permitNumber: loc.permitNumber,
      locationName: loc.locationName,
      locationAddress: loc.locationAddress,
      locationCity: loc.locationCity,
      locationCounty: loc.locationCounty,
      locationZip: loc.locationZip,
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lng),
      totalSales: parseFloat(loc.totalSales),
      liquorSales: parseFloat(loc.liquorSales),
      wineSales: parseFloat(loc.wineSales),
      beerSales: parseFloat(loc.beerSales),
      latestMonth: loc.latestMonth,
      monthlyRecords: monthlyRecordsMap.get(loc.permitNumber) || [],
    }))

    // Cache the results
    this.locationCache.set(cacheKey, {
      data: locations,
      timestamp: Date.now()
    });

    console.log(`Cached ${locations.length} locations for key: ${cacheKey}`);
    return locations;
  }

  async getLocationByPermit(permitNumber: string): Promise<LocationSummary | null> {
    console.log(`Querying database for permit: ${permitNumber}`);
    
    // Step 1: Aggregate sales for this specific permit
    const [aggregated] = await db
      .select({
        permitNumber: monthlySales.permitNumber,
        locationName: monthlySales.locationName,
        locationAddress: monthlySales.locationAddress,
        locationCity: monthlySales.locationCity,
        locationCounty: monthlySales.locationCounty,
        locationZip: monthlySales.locationZip,
        lat: monthlySales.lat,
        lng: monthlySales.lng,
        totalSales: sql<string>`SUM(${monthlySales.totalReceipts})::text`,
        liquorSales: sql<string>`SUM(${monthlySales.liquorReceipts})::text`,
        wineSales: sql<string>`SUM(${monthlySales.wineReceipts})::text`,
        beerSales: sql<string>`SUM(${monthlySales.beerReceipts})::text`,
        latestMonth: sql<string>`MAX(${monthlySales.obligationEndDate})::text`,
      })
      .from(monthlySales)
      .where(eq(monthlySales.permitNumber, permitNumber))
      .groupBy(
        monthlySales.permitNumber,
        monthlySales.locationName,
        monthlySales.locationAddress,
        monthlySales.locationCity,
        monthlySales.locationCounty,
        monthlySales.locationZip,
        monthlySales.lat,
        monthlySales.lng
      );

    if (!aggregated) {
      console.log(`No data found for permit: ${permitNumber}`);
      return null;
    }

    // Step 2: Get all monthly records for this permit
    const monthlyRecords = await db
      .select()
      .from(monthlySales)
      .where(eq(monthlySales.permitNumber, permitNumber))
      .orderBy(desc(monthlySales.obligationEndDate));

    const monthlyRecordsData: MonthlySalesRecord[] = monthlyRecords.map(record => ({
      permitNumber: record.permitNumber,
      locationName: record.locationName,
      locationAddress: record.locationAddress,
      locationCity: record.locationCity,
      locationCounty: record.locationCounty,
      locationZip: record.locationZip,
      taxpayerName: record.taxpayerName,
      obligationEndDate: record.obligationEndDate.toISOString(),
      liquorReceipts: parseFloat(record.liquorReceipts),
      wineReceipts: parseFloat(record.wineReceipts),
      beerReceipts: parseFloat(record.beerReceipts),
      coverChargeReceipts: parseFloat(record.coverChargeReceipts),
      totalReceipts: parseFloat(record.totalReceipts),
      lat: parseFloat(record.lat),
      lng: parseFloat(record.lng),
    }));

    const location: LocationSummary = {
      permitNumber: aggregated.permitNumber,
      locationName: aggregated.locationName,
      locationAddress: aggregated.locationAddress,
      locationCity: aggregated.locationCity,
      locationCounty: aggregated.locationCounty,
      locationZip: aggregated.locationZip,
      lat: parseFloat(aggregated.lat),
      lng: parseFloat(aggregated.lng),
      totalSales: parseFloat(aggregated.totalSales),
      liquorSales: parseFloat(aggregated.liquorSales),
      wineSales: parseFloat(aggregated.wineSales),
      beerSales: parseFloat(aggregated.beerSales),
      latestMonth: aggregated.latestMonth,
      monthlyRecords: monthlyRecordsData,
    };

    console.log(`Found location for permit ${permitNumber}: ${location.locationName}`);
    return location;
  }

  getCachedLocations(cacheKey?: string): LocationSummary[] | null {
    // Not needed with direct database access + internal cache
    return null;
  }

  setCachedLocations(locations: LocationSummary[], cacheKey?: string): void {
    // Not needed with direct database access + internal cache
  }

  clearCache(): void {
    this.locationCache.clear();
    console.log('DatabaseStorage: Cleared all location caches');
  }
}

export const storage = new DatabaseStorage();
