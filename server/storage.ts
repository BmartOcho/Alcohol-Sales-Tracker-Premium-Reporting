import { type User, type InsertUser, type Establishment, type TexasDataRecord } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getEstablishments(): Promise<Establishment[]>;
  getCachedEstablishments(): Establishment[] | null;
  setCachedEstablishments(establishments: Establishment[]): void;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private cachedEstablishments: Establishment[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 1000 * 60 * 15; // 15 minutes

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

  async getEstablishments(): Promise<Establishment[]> {
    const now = Date.now();
    if (this.cachedEstablishments && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedEstablishments;
    }
    return [];
  }

  getCachedEstablishments(): Establishment[] | null {
    const now = Date.now();
    if (this.cachedEstablishments && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedEstablishments;
    }
    return null;
  }

  setCachedEstablishments(establishments: Establishment[]): void {
    this.cachedEstablishments = establishments;
    this.cacheTimestamp = Date.now();
  }
}

export const storage = new MemStorage();
