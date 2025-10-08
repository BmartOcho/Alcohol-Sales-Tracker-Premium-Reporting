import { type User, type InsertUser, type LocationSummary } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getLocations(): Promise<LocationSummary[]>;
  getCachedLocations(cacheKey?: string): LocationSummary[] | null;
  setCachedLocations(locations: LocationSummary[], cacheKey?: string): void;
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

  async getLocations(): Promise<LocationSummary[]> {
    const cache = this.locationCaches.get('default');
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
}

export const storage = new MemStorage();
