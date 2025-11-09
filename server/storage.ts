import { type User, type UpsertUser, type LocationSummary, type MonthlySalesRecord, type InsertContactMessage, type ContactMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (Required for Replit Auth - from blueprint:javascript_log_in_with_replit)
  getUser(id: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Stripe subscription operations (from blueprint:javascript_stripe)
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User>;
  updateSubscriptionStatus(userId: string, updates: {
    subscriptionStatus?: string;
    subscriptionTier?: string;
    stripeSubscriptionId?: string | null;
    subscriptionEndsAt?: Date | null;
  }): Promise<User>;
  clearStripeSubscription(userId: string): Promise<User>;
  // Location operations
  getLocations(startDate?: string, endDate?: string): Promise<LocationSummary[]>;
  getLocationByPermit(permitNumber: string): Promise<LocationSummary | null>;
  getLocationsByName(locationName: string): Promise<LocationSummary[]>;
  getCachedLocations(cacheKey?: string): LocationSummary[] | null;
  setCachedLocations(locations: LocationSummary[], cacheKey?: string): void;
  clearCache(): void;
  // Contact message operations
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
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

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const allUsers = Array.from(this.users.values());
    return allUsers.find(user => user.stripeCustomerId === customerId);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const id = userData.id || randomUUID();
    const now = new Date();
    const user: User = {
      ...userData,
      id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      subscriptionStatus: userData.subscriptionStatus || 'free',
      subscriptionTier: userData.subscriptionTier || 'free',
      stripeCustomerId: userData.stripeCustomerId || null,
      stripeSubscriptionId: userData.stripeSubscriptionId || null,
      subscriptionEndsAt: userData.subscriptionEndsAt || null,
      createdAt: this.users.get(id)?.createdAt || now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    const updated = {
      ...user,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      // Don't set status to 'active' here - wait for payment confirmation
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async updateSubscriptionStatus(userId: string, updates: {
    subscriptionStatus?: string;
    subscriptionTier?: string;
    stripeSubscriptionId?: string | null;
    subscriptionEndsAt?: Date | null;
  }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    const updated = {
      ...user,
      ...(updates.subscriptionStatus !== undefined && { subscriptionStatus: updates.subscriptionStatus }),
      ...(updates.subscriptionTier !== undefined && { subscriptionTier: updates.subscriptionTier }),
      ...(updates.stripeSubscriptionId !== undefined && { stripeSubscriptionId: updates.stripeSubscriptionId }),
      ...(updates.subscriptionEndsAt !== undefined && { subscriptionEndsAt: updates.subscriptionEndsAt }),
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async clearStripeSubscription(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    const updated = {
      ...user,
      stripeSubscriptionId: null,
      subscriptionStatus: 'free',
      subscriptionEndsAt: null,
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
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

  async getLocationsByName(locationName: string): Promise<LocationSummary[]> {
    // MemStorage doesn't have data, return empty array
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

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const contactMessage: ContactMessage = {
      id: randomUUID(),
      ...message,
      createdAt: new Date(),
    };
    return contactMessage;
  }
}

import { db } from "./db";
import { monthlySales, users, contactMessages } from "@shared/schema";
import { and, between, eq, desc, sql, inArray } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  private locationCache: Map<string, { data: LocationSummary[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour cache for all database queries

  // User operations (Required for Replit Auth - from blueprint:javascript_log_in_with_replit)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Stripe subscription operations (from blueprint:javascript_stripe)
  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        // Don't set status to 'active' here - wait for payment confirmation via webhook
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateSubscriptionStatus(userId: string, updates: {
    subscriptionStatus?: string;
    subscriptionTier?: string;
    stripeSubscriptionId?: string | null;
    subscriptionEndsAt?: Date | null;
  }): Promise<User> {
    const updateData: any = { updatedAt: new Date() };
    if (updates.subscriptionStatus !== undefined) updateData.subscriptionStatus = updates.subscriptionStatus;
    if (updates.subscriptionTier !== undefined) updateData.subscriptionTier = updates.subscriptionTier;
    if (updates.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = updates.stripeSubscriptionId;
    if (updates.subscriptionEndsAt !== undefined) updateData.subscriptionEndsAt = updates.subscriptionEndsAt;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) throw new Error('User not found');
    return user;
  }

  async clearStripeSubscription(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeSubscriptionId: null,
        subscriptionStatus: 'free',
        subscriptionEndsAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) throw new Error('User not found');
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
    // Group only by permitNumber, use MAX() for location details to avoid splitting data
    const aggregationQuery = db
      .select({
        permitNumber: monthlySales.permitNumber,
        locationName: sql<string>`MAX(${monthlySales.locationName})`,
        locationAddress: sql<string>`MAX(${monthlySales.locationAddress})`,
        locationCity: sql<string>`MAX(${monthlySales.locationCity})`,
        locationCounty: sql<string>`MAX(${monthlySales.locationCounty})`,
        locationZip: sql<string>`MAX(${monthlySales.locationZip})`,
        lat: sql<string>`MAX(${monthlySales.lat})`,
        lng: sql<string>`MAX(${monthlySales.lng})`,
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
      .groupBy(monthlySales.permitNumber);
    
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
    console.log(`[STORAGE] Querying database for permit: ${permitNumber}`);
    
    // Step 1: Aggregate sales for this specific permit
    // Use MAX() for location details instead of GROUP BY to avoid splitting data if details vary
    const [aggregated] = await db
      .select({
        permitNumber: monthlySales.permitNumber,
        locationName: sql<string>`MAX(${monthlySales.locationName})`,
        locationAddress: sql<string>`MAX(${monthlySales.locationAddress})`,
        locationCity: sql<string>`MAX(${monthlySales.locationCity})`,
        locationCounty: sql<string>`MAX(${monthlySales.locationCounty})`,
        locationZip: sql<string>`MAX(${monthlySales.locationZip})`,
        lat: sql<string>`MAX(${monthlySales.lat})`,
        lng: sql<string>`MAX(${monthlySales.lng})`,
        totalSales: sql<string>`SUM(${monthlySales.totalReceipts})::text`,
        liquorSales: sql<string>`SUM(${monthlySales.liquorReceipts})::text`,
        wineSales: sql<string>`SUM(${monthlySales.wineReceipts})::text`,
        beerSales: sql<string>`SUM(${monthlySales.beerReceipts})::text`,
        latestMonth: sql<string>`MAX(${monthlySales.obligationEndDate})::text`,
      })
      .from(monthlySales)
      .where(eq(monthlySales.permitNumber, permitNumber))
      .groupBy(monthlySales.permitNumber); // Group ONLY by permit number!
    
    console.log(`[STORAGE] Aggregated result for ${permitNumber}:`, {
      totalSales: aggregated?.totalSales,
      liquorSales: aggregated?.liquorSales,
      wineSales: aggregated?.wineSales,
      beerSales: aggregated?.beerSales
    });

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

  async getLocationsByName(locationName: string): Promise<LocationSummary[]> {
    console.log(`Searching database for location name: ${locationName}`);
    
    // OPTIMIZED: Use denormalized establishments table for instant search
    // This avoids expensive GROUP BY aggregations on 1.8M+ monthly records
    const { establishments } = await import('@shared/schema');
    
    const aggregatedLocations = await db
      .select({
        permitNumber: establishments.permitNumber,
        locationName: establishments.locationName,
        locationAddress: establishments.locationAddress,
        locationCity: establishments.locationCity,
        locationCounty: establishments.locationCounty,
        locationZip: establishments.locationZip,
        lat: sql<string>`${establishments.lat}::text`,
        lng: sql<string>`${establishments.lng}::text`,
        totalSales: sql<string>`${establishments.totalSales}::text`,
        liquorSales: sql<string>`${establishments.liquorSales}::text`,
        wineSales: sql<string>`${establishments.wineSales}::text`,
        beerSales: sql<string>`${establishments.beerSales}::text`,
        latestMonth: sql<string>`${establishments.latestMonth}::text`,
      })
      .from(establishments)
      .where(sql`lower(${establishments.locationName}) LIKE lower(${`%${locationName}%`})`)
      .orderBy(desc(establishments.totalSales))
      .limit(50);

    if (aggregatedLocations.length === 0) {
      console.log(`No locations found matching: ${locationName}`);
      return [];
    }

    // Get permit numbers for fetching monthly records
    const permitNumbers = aggregatedLocations.map(loc => loc.permitNumber);

    // Fetch monthly records for all found permits
    const monthlyRecords = await db
      .select()
      .from(monthlySales)
      .where(inArray(monthlySales.permitNumber, permitNumbers))
      .orderBy(desc(monthlySales.obligationEndDate));

    // Group monthly records by permit number
    const monthlyRecordsMap = new Map<string, MonthlySalesRecord[]>();
    for (const record of monthlyRecords) {
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

    // Combine aggregated data with monthly records
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
    }));

    console.log(`Found ${locations.length} locations matching: ${locationName}`);
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

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [contactMessage] = await db
      .insert(contactMessages)
      .values(message)
      .returning();
    return contactMessage;
  }
}

export const storage = new DatabaseStorage();
