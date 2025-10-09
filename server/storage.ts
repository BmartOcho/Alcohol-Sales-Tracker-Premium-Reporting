import { type User, type InsertUser, type LocationSummary, type MonthlySalesRecord } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getLocations(startDate?: string, endDate?: string): Promise<LocationSummary[]>;
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
  private inFlightRequests: Map<string, Promise<LocationSummary[]>> = new Map(); // Deduplicate concurrent requests
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour cache for historical data
  private readonly CACHE_TTL_2025 = 1000 * 60 * 15; // 15 minute cache for 2025 (current year updates monthly)

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
    const year = startDate ? new Date(startDate).getFullYear() : null;
    const cacheKey = startDate && endDate ? `${startDate}_${endDate}` : 'all';
    const cached = this.locationCache.get(cacheKey);
    const now = Date.now();
    
    // Check if requesting 2025 data - if so, fetch from API with shorter cache
    if (year === 2025) {
      if (cached && (now - cached.timestamp) < this.CACHE_TTL_2025) {
        console.log(`✨ 2025 cache hit - returning ${cached.data.length} locations from memory`);
        return cached.data;
      }
      
      // Check if there's already an in-flight request for this data
      let inFlight = this.inFlightRequests.get(cacheKey);
      if (inFlight) {
        console.log('✨ Waiting for in-flight 2025 request to complete...');
        return await inFlight;
      }
      
      // Create a deferred promise and store it IMMEDIATELY before any async operations
      console.log('✨ Fetching 2025 data from Texas API (real-time)...');
      let resolvePromise!: (value: LocationSummary[]) => void;
      let rejectPromise!: (reason?: any) => void;
      
      const requestPromise = new Promise<LocationSummary[]>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      
      // Set immediately to prevent other concurrent requests from starting (BEFORE any await!)
      this.inFlightRequests.set(cacheKey, requestPromise);
      
      // Now fetch the data asynchronously
      (async () => {
        try {
          const { fetchAllTexasAlcoholData } = await import("./services/texasDataService");
          const locations = await fetchAllTexasAlcoholData(Infinity, startDate, endDate);
          
          // Cache 2025 data with shorter TTL (15 minutes)
          this.locationCache.set(cacheKey, {
            data: locations,
            timestamp: Date.now()
          });
          console.log(`✨ Cached ${locations.length} 2025 locations (15 min TTL)`);
          
          resolvePromise(locations);
        } catch (error) {
          console.error('❌ Error fetching 2025 data from API:', error);
          rejectPromise(error);
        } finally {
          // Remove from in-flight requests (even if error occurred)
          this.inFlightRequests.delete(cacheKey);
        }
      })();
      
      return await requestPromise;
    }

    // For historical years (2015-2024), use database with cache
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log(`Cache hit - returning ${cached.data.length} locations from memory`);
      return cached.data;
    }
    
    console.log('Cache miss - querying database...');
    // Build WHERE clause for date filtering
    let whereClause;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      whereClause = and(
        sql`${monthlySales.obligationEndDate} >= ${start}`,
        sql`${monthlySales.obligationEndDate} <= ${end}`
      );
    }

    // Query all monthly sales records
    const records = await db
      .select()
      .from(monthlySales)
      .where(whereClause)
      .orderBy(desc(monthlySales.obligationEndDate));

    // Group by permit number to create location summaries
    const locationMap = new Map<string, {
      info: any;
      monthlyRecords: MonthlySalesRecord[];
    }>();

    for (const record of records) {
      const permitNumber = record.permitNumber;
      
      if (!locationMap.has(permitNumber)) {
        locationMap.set(permitNumber, {
          info: {
            permitNumber: record.permitNumber,
            locationName: record.locationName,
            locationAddress: record.locationAddress,
            locationCity: record.locationCity,
            locationCounty: record.locationCounty,
            locationZip: record.locationZip,
            lat: parseFloat(record.lat),
            lng: parseFloat(record.lng),
          },
          monthlyRecords: []
        });
      }

      const location = locationMap.get(permitNumber)!;
      location.monthlyRecords.push({
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

    // Convert map to LocationSummary array
    const locations: LocationSummary[] = [];
    const entries = Array.from(locationMap.entries());
    
    for (const [permitNumber, data] of entries) {
      const totalSales = data.monthlyRecords.reduce((sum: number, r: MonthlySalesRecord) => sum + r.totalReceipts, 0);
      const liquorSales = data.monthlyRecords.reduce((sum: number, r: MonthlySalesRecord) => sum + r.liquorReceipts, 0);
      const wineSales = data.monthlyRecords.reduce((sum: number, r: MonthlySalesRecord) => sum + r.wineReceipts, 0);
      const beerSales = data.monthlyRecords.reduce((sum: number, r: MonthlySalesRecord) => sum + r.beerReceipts, 0);
      const latestMonth = data.monthlyRecords[0]?.obligationEndDate || "";

      locations.push({
        ...data.info,
        totalSales,
        liquorSales,
        wineSales,
        beerSales,
        latestMonth,
        monthlyRecords: data.monthlyRecords,
      });
    }

    // Cache the results
    this.locationCache.set(cacheKey, {
      data: locations,
      timestamp: Date.now()
    });

    console.log(`Cached ${locations.length} locations for key: ${cacheKey}`);
    return locations;
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
