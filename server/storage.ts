import { type User, type InsertUser, type LocationSummary } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getLocations(): Promise<LocationSummary[]>;
  getCachedLocations(): LocationSummary[] | null;
  setCachedLocations(locations: LocationSummary[]): void;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private cachedLocations: LocationSummary[] | null = null;
  private cacheTimestamp: number = 0;
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
    const now = Date.now();
    if (this.cachedLocations && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedLocations;
    }
    return [];
  }

  getCachedLocations(): LocationSummary[] | null {
    const now = Date.now();
    if (this.cachedLocations && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedLocations;
    }
    return null;
  }

  setCachedLocations(locations: LocationSummary[]): void {
    this.cachedLocations = locations;
    this.cacheTimestamp = Date.now();
  }
}

export const storage = new MemStorage();
