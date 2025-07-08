import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt?: Date;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalKeys: number;
  totalSize: number; // approximate size in bytes
  hitCount: number;
  missCount: number;
  hitRate: number;
  expiredKeys: number;
  memoryUsage: {
    used: number;
    available: number;
    percentage: number;
  };
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[];
  metadata?: Record<string, any>;
  compress?: boolean;
  serialize?: boolean;
}

export class CacheService extends BaseService {
  private initialized = false;
  private cache: Map<string, CacheEntry> = new Map();
  private hitCount = 0;
  private missCount = 0;
  private maxMemoryUsage = 100 * 1024 * 1024; // 100MB default
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super('CacheService');
  }

  async init(): Promise<void> {
    console.log('Initializing CacheService');
    
    try {
      // Start cleanup interval
      this.startCleanupInterval();
      
      this.initialized = true;
      console.log('CacheService initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const now = new Date();
      let expiresAt: Date | undefined;

      if (options?.ttl) {
        expiresAt = new Date(now.getTime() + options.ttl * 1000);
      }

      // Serialize value if needed
      let serializedValue = value;
      if (options?.serialize && typeof value === 'object') {
        serializedValue = JSON.parse(JSON.stringify(value)) as T;
      }

      const entry: CacheEntry<T> = {
        key,
        value: serializedValue,
        expiresAt,
        createdAt: now,
        accessCount: 0,
        lastAccessed: now,
        tags: options?.tags,
        metadata: options?.metadata,
      };

      this.cache.set(key, entry);

      // Check memory usage and evict if necessary
      await this.checkMemoryUsage();

      console.log('Cache entry set', { key, ttl: options?.ttl, tags: options?.tags });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;

      if (!entry) {
        this.missCount++;
        return null;
      }

      // Check if expired
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        this.cache.delete(key);
        this.missCount++;
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = new Date();
      this.hitCount++;

      return entry.value;
    } catch (error) {
      this.handleError(error as Error);
      this.missCount++;
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return false;
      }

      // Check if expired
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        console.log('Cache entry deleted', { key });
      }
      return deleted;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const size = this.cache.size;
      this.cache.clear();
      this.hitCount = 0;
      this.missCount = 0;
      console.log('Cache cleared', { entriesRemoved: size });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options?: CacheOptions
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Generate value using factory function
      const value = await factory();
      
      // Store in cache
      await this.set(key, value, options);
      
      return value;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async mget<T>(keys: string[]): Promise<Array<{ key: string; value: T | null }>> {
    try {
      const results: Array<{ key: string; value: T | null }> = [];
      
      for (const key of keys) {
        const value = await this.get<T>(key);
        results.push({ key, value });
      }
      
      return results;
    } catch (error) {
      this.handleError(error as Error);
      return keys.map(key => ({ key, value: null }));
    }
  }

  async mset<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void> {
    try {
      for (const entry of entries) {
        await this.set(entry.key, entry.value, entry.options);
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      const allKeys = Array.from(this.cache.keys());
      
      if (!pattern) {
        return allKeys;
      }

      // Simple pattern matching (supports * wildcard)
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return allKeys.filter(key => regex.test(key));
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async getByTag(tag: string): Promise<Array<{ key: string; value: any }>> {
    try {
      const results: Array<{ key: string; value: any }> = [];
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.tags && entry.tags.includes(tag)) {
          // Check if expired
          if (!entry.expiresAt || entry.expiresAt >= new Date()) {
            results.push({ key, value: entry.value });
          }
        }
      }
      
      return results;
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async deleteByTag(tag: string): Promise<number> {
    try {
      let deletedCount = 0;
      const keysToDelete: string[] = [];
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.tags && entry.tags.includes(tag)) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        if (this.cache.delete(key)) {
          deletedCount++;
        }
      }
      
      console.log('Cache entries deleted by tag', { tag, count: deletedCount });
      return deletedCount;
    } catch (error) {
      this.handleError(error as Error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return false;
      }

      entry.expiresAt = new Date(Date.now() + ttl * 1000);
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async ttl(key: string): Promise<number | null> {
    try {
      const entry = this.cache.get(key);
      if (!entry || !entry.expiresAt) {
        return null;
      }

      const remaining = entry.expiresAt.getTime() - Date.now();
      return Math.max(0, Math.floor(remaining / 1000));
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async increment(key: string, delta: number = 1): Promise<number> {
    try {
      const current = await this.get<number>(key);
      const newValue = (current || 0) + delta;
      await this.set(key, newValue);
      return newValue;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async decrement(key: string, delta: number = 1): Promise<number> {
    return this.increment(key, -delta);
  }

  private cleanupExpired(): void {
    try {
      const now = new Date();
      const keysToDelete: string[] = [];
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt && entry.expiresAt < now) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
      
      if (keysToDelete.length > 0) {
        console.log('Expired cache entries cleaned up', { count: keysToDelete.length });
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  private async checkMemoryUsage(): Promise<void> {
    try {
      const stats = await this.getStats();
      
      if (stats.memoryUsage.percentage > 90) {
        // Evict least recently used entries
        await this.evictLRU(Math.floor(this.cache.size * 0.1)); // Evict 10%
      }
    } catch (error) {
      console.error('Error checking memory usage:', error);
    }
  }

  private async evictLRU(count: number): Promise<void> {
    try {
      // Sort entries by last accessed time
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
      
      const toEvict = entries.slice(0, count);
      
      for (const [key] of toEvict) {
        this.cache.delete(key);
      }
      
      console.log('LRU cache eviction completed', { evicted: toEvict.length });
    } catch (error) {
      console.error('Error during LRU eviction:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const now = new Date();
      let totalSize = 0;
      let expiredKeys = 0;
      
      // Calculate approximate size and count expired keys
      for (const entry of this.cache.values()) {
        // Rough size estimation
        totalSize += JSON.stringify(entry.value).length * 2; // Approximate bytes
        
        if (entry.expiresAt && entry.expiresAt < now) {
          expiredKeys++;
        }
      }
      
      const totalRequests = this.hitCount + this.missCount;
      const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
      
      return {
        totalKeys: this.cache.size,
        totalSize,
        hitCount: this.hitCount,
        missCount: this.missCount,
        hitRate: Math.round(hitRate * 100) / 100,
        expiredKeys,
        memoryUsage: {
          used: totalSize,
          available: this.maxMemoryUsage,
          percentage: Math.round((totalSize / this.maxMemoryUsage) * 100),
        },
      };
    } catch (error) {
      this.handleError(error as Error);
      return {
        totalKeys: 0,
        totalSize: 0,
        hitCount: 0,
        missCount: 0,
        hitRate: 0,
        expiredKeys: 0,
        memoryUsage: {
          used: 0,
          available: this.maxMemoryUsage,
          percentage: 0,
        },
      };
    }
  }

  async flush(): Promise<void> {
    await this.clear();
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  // Utility methods for common caching patterns
  async cacheFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R> | R,
    keyGenerator: (...args: T) => string,
    options?: CacheOptions
  ): Promise<(...args: T) => Promise<R>> {
    return async (...args: T): Promise<R> => {
      const key = keyGenerator(...args);
      return this.getOrSet(key, () => fn(...args), options);
    };
  }

  // Alias for getOrSet to match route expectations
  async wrap<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const options: CacheOptions = ttl ? { ttl } : {};
    return this.getOrSet(key, factory, options);
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const stats = await this.getStats();
    
    return {
      status: 'healthy',
      details: {
        service: 'CacheService',
        initialized: this.initialized,
        stats,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down CacheService');
    
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear cache
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.initialized = false;
  }
}
