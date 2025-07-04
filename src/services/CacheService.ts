import { BaseService } from "./BaseService";

export class CacheService extends BaseService {
  private cache: Map<string, { data: any; expires: number }> = new Map();

  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ CacheService initialized");

    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async wrap<T>(
    key: string,
    fetcher: () => Promise<T> | T,
    ttlSeconds = 300,
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached as T;
    }

    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }

  set(key: string, value: any, ttlSeconds = 300): void {
    const expires = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data: value, expires });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  async shutdown(): Promise<void> {
    this.clear();
    console.log("🛑 CacheService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return {
      status: "healthy",
      details: {
        cacheSize: this.cache.size,
      },
    };
  }
}
