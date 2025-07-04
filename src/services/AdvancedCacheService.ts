import { createClient } from "redis";
import { sql } from "../config/db";
// src/services/AdvancedCacheService.ts
import { BaseService } from "./BaseService";
import { ServiceManager } from "./ServiceManager";

interface CacheConfig {
  ttl: number;
  strategy: "simple" | "sliding" | "write-through" | "write-behind";
}

export class AdvancedCacheService extends BaseService {
  private redis: any;
  private writeQueue: Map<string, any> = new Map();
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    super("advanced-cache");
    this.initializeRedis();
    this.startWriteBehindWorker();
  }

  async initialize(): Promise<void> {
    console.log("✅ AdvancedCacheService initialized");
  }

  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    console.log("🛑 AdvancedCacheService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      await this.redis.ping();
      return { status: "healthy", details: { redis: "connected" } };
    } catch (error) {
      return { status: "unhealthy", details: { redis: "disconnected" } };
    }
  }

  private async initializeRedis() {
    this.redis = createClient({
      url: process.env.REDIS_URL,
    });

    await this.redis.connect();
  }

  private startWriteBehindWorker() {
    setInterval(async () => {
      if (this.writeQueue.size > 0) {
        await this.flushWriteQueue();
      }
    }, this.FLUSH_INTERVAL);
  }

  async get<T>(key: string, config?: Partial<CacheConfig>): Promise<T | null> {
    const value = await this.redis.get(key);

    if (!value) return null;

    if (config?.strategy === "sliding") {
      await this.redis.expire(key, config.ttl || 300);
    }

    return JSON.parse(value);
  }

  async set<T>(
    key: string,
    value: T,
    config?: Partial<CacheConfig>,
  ): Promise<void> {
    const strategy = config?.strategy || "simple";

    switch (strategy) {
      case "write-through":
        await this.setWithWriteThrough(key, value, config);
        break;
      case "write-behind":
        await this.setWithWriteBehind(key, value, config);
        break;
      default:
        await this.setSimple(key, value, config);
    }
  }

  private async setSimple<T>(
    key: string,
    value: T,
    config?: Partial<CacheConfig>,
  ): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), {
      EX: config?.ttl || 300,
    });
  }

  private async setWithWriteThrough<T>(
    key: string,
    value: T,
    config?: Partial<CacheConfig>,
  ): Promise<void> {
    // Write to database first
    await this.executeQuery(async () => {
      await sql`
        INSERT INTO cache_store (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = ${JSON.stringify(value)}, updated_at = NOW()
      `;
    });

    // Then update cache
    await this.setSimple(key, value, config);
  }

  private async setWithWriteBehind<T>(
    key: string,
    value: T,
    config?: Partial<CacheConfig>,
  ): Promise<void> {
    // Update cache immediately
    await this.setSimple(key, value, config);

    // Queue write to database
    this.writeQueue.set(key, value);
  }

  private async flushWriteQueue(): Promise<void> {
    const entries = Array.from(this.writeQueue.entries());
    this.writeQueue.clear();

    if (entries.length === 0) return;

    await this.executeQuery(async () => {
      for (const [key, value] of entries) {
        await sql`
          INSERT INTO cache_store (key, value, updated_at)
          VALUES (${key}, ${JSON.stringify(value)}, NOW())
          ON CONFLICT (key) DO UPDATE
          SET value = ${JSON.stringify(value)}, updated_at = NOW()
        `;
      }
    });
  }

  async invalidate(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }
}
