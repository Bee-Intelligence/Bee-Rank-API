import { BaseService } from "../../core/base/BaseService";
import { CacheService, CacheEntry, CacheOptions } from "./CacheService";

export interface DistributedCacheOptions extends CacheOptions {
  partition?: string;
  consistency?: 'eventual' | 'strong';
  replication?: number;
}

export interface CacheLayer {
  name: string;
  priority: number;
  cache: CacheService;
  enabled: boolean;
}

export interface CachePattern {
  name: string;
  keyPattern: RegExp;
  defaultTTL: number;
  tags: string[];
  layer: string;
}

export interface CacheMetrics {
  layerStats: Record<string, {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  }>;
  patternStats: Record<string, {
    requests: number;
    hits: number;
    avgResponseTime: number;
  }>;
  totalRequests: number;
  totalHits: number;
  overallHitRate: number;
}

export class AdvancedCacheService extends BaseService {
  private initialized = false;
  private layers: Map<string, CacheLayer> = new Map();
  private patterns: CachePattern[] = [];
  private metrics: CacheMetrics = {
    layerStats: {},
    patternStats: {},
    totalRequests: 0,
    totalHits: 0,
    overallHitRate: 0,
  };

  constructor() {
    super('AdvancedCacheService');
  }

  async init(): Promise<void> {
    console.log('Initializing AdvancedCacheService');
    
    try {
      // Initialize default cache layers
      await this.initializeDefaultLayers();
      
      // Setup default cache patterns
      this.setupDefaultPatterns();
      
      this.initialized = true;
      console.log('AdvancedCacheService initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async initializeDefaultLayers(): Promise<void> {
    // L1 Cache - Fast, small capacity
    const l1Cache = new CacheService();
    await l1Cache.init();
    this.addLayer('l1', l1Cache, 1, true);

    // L2 Cache - Medium speed, larger capacity
    const l2Cache = new CacheService();
    await l2Cache.init();
    this.addLayer('l2', l2Cache, 2, true);

    // L3 Cache - Slower, largest capacity (could be Redis/external)
    const l3Cache = new CacheService();
    await l3Cache.init();
    this.addLayer('l3', l3Cache, 3, true);

    console.log('Default cache layers initialized');
  }

  private setupDefaultPatterns(): void {
    this.patterns = [
      {
        name: 'user-data',
        keyPattern: /^user:/,
        defaultTTL: 300, // 5 minutes
        tags: ['user'],
        layer: 'l1',
      },
      {
        name: 'location-data',
        keyPattern: /^location:/,
        defaultTTL: 60, // 1 minute
        tags: ['location', 'realtime'],
        layer: 'l1',
      },
      {
        name: 'route-data',
        keyPattern: /^route:/,
        defaultTTL: 1800, // 30 minutes
        tags: ['route', 'transit'],
        layer: 'l2',
      },
      {
        name: 'static-data',
        keyPattern: /^static:/,
        defaultTTL: 3600, // 1 hour
        tags: ['static'],
        layer: 'l3',
      },
      {
        name: 'session-data',
        keyPattern: /^session:/,
        defaultTTL: 1800, // 30 minutes
        tags: ['session'],
        layer: 'l1',
      },
    ];

    console.log('Default cache patterns configured');
  }

  addLayer(name: string, cache: CacheService, priority: number, enabled: boolean = true): void {
    const layer: CacheLayer = {
      name,
      priority,
      cache,
      enabled,
    };

    this.layers.set(name, layer);
    this.metrics.layerStats[name] = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
    };

    console.log('Cache layer added', { name, priority, enabled });
  }

  removeLayer(name: string): boolean {
    const removed = this.layers.delete(name);
    if (removed) {
      delete this.metrics.layerStats[name];
      console.log('Cache layer removed', { name });
    }
    return removed;
  }

  addPattern(pattern: CachePattern): void {
    this.patterns.push(pattern);
    this.metrics.patternStats[pattern.name] = {
      requests: 0,
      hits: 0,
      avgResponseTime: 0,
    };
    console.log('Cache pattern added', { name: pattern.name });
  }

  private findPattern(key: string): CachePattern | null {
    return this.patterns.find(pattern => pattern.keyPattern.test(key)) || null;
  }

  private getOrderedLayers(): CacheLayer[] {
    return Array.from(this.layers.values())
      .filter(layer => layer.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  async set<T>(key: string, value: T, options?: DistributedCacheOptions): Promise<void> {
    try {
      const startTime = Date.now();
      const pattern = this.findPattern(key);
      
      // Determine which layers to write to
      let targetLayers: CacheLayer[];
      
      if (options?.partition) {
        const layer = this.layers.get(options.partition);
        targetLayers = layer ? [layer] : [];
      } else if (pattern) {
        const layer = this.layers.get(pattern.layer);
        targetLayers = layer ? [layer] : this.getOrderedLayers().slice(0, 1);
      } else {
        // Default to L1 cache
        targetLayers = this.getOrderedLayers().slice(0, 1);
      }

      // Merge options with pattern defaults
      const finalOptions: CacheOptions = {
        ttl: options?.ttl || pattern?.defaultTTL,
        tags: [...(options?.tags || []), ...(pattern?.tags || [])],
        ...options,
      };

      // Write to target layers
      const writePromises = targetLayers.map(layer => 
        layer.cache.set(key, value, finalOptions)
      );

      await Promise.all(writePromises);

      // Update metrics
      if (pattern) {
        this.metrics.patternStats[pattern.name].requests++;
      }

      const responseTime = Date.now() - startTime;
      console.log('Advanced cache set completed', { 
        key, 
        layers: targetLayers.map(l => l.name), 
        responseTime 
      });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async get<T>(key: string, options?: { preferredLayer?: string }): Promise<T | null> {
    try {
      const startTime = Date.now();
      const pattern = this.findPattern(key);
      
      this.metrics.totalRequests++;
      if (pattern) {
        this.metrics.patternStats[pattern.name].requests++;
      }

      // Determine search order
      let searchLayers: CacheLayer[];
      
      if (options?.preferredLayer) {
        const preferred = this.layers.get(options.preferredLayer);
        if (preferred) {
          searchLayers = [preferred, ...this.getOrderedLayers().filter(l => l.name !== options.preferredLayer)];
        } else {
          searchLayers = this.getOrderedLayers();
        }
      } else {
        searchLayers = this.getOrderedLayers();
      }

      // Search through layers
      for (const layer of searchLayers) {
        const value = await layer.cache.get<T>(key);
        
        if (value !== null) {
          // Cache hit
          this.metrics.totalHits++;
          this.metrics.layerStats[layer.name].hits++;
          
          if (pattern) {
            this.metrics.patternStats[pattern.name].hits++;
          }

          // Promote to higher priority layers (cache warming)
          await this.promoteToHigherLayers(key, value, layer, searchLayers);

          const responseTime = Date.now() - startTime;
          if (pattern) {
            this.updateAvgResponseTime(pattern.name, responseTime);
          }

          console.log('Advanced cache hit', { key, layer: layer.name, responseTime });
          return value;
        } else {
          // Cache miss for this layer
          this.metrics.layerStats[layer.name].misses++;
        }
      }

      // Complete miss
      console.log('Advanced cache miss', { key });
      return null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  private async promoteToHigherLayers<T>(
    key: string, 
    value: T, 
    hitLayer: CacheLayer, 
    searchLayers: CacheLayer[]
  ): Promise<void> {
    try {
      const higherPriorityLayers = searchLayers.filter(layer => 
        layer.priority < hitLayer.priority
      );

      if (higherPriorityLayers.length === 0) {
        return;
      }

      // Get TTL from the hit layer
      const ttl = await hitLayer.cache.ttl(key);
      const options: CacheOptions = ttl ? { ttl } : {};

      // Promote to higher priority layers
      const promotePromises = higherPriorityLayers.map(layer =>
        layer.cache.set(key, value, options)
      );

      await Promise.all(promotePromises);
      
      console.log('Cache entry promoted', { 
        key, 
        from: hitLayer.name, 
        to: higherPriorityLayers.map(l => l.name) 
      });
    } catch (error) {
      console.error('Error promoting cache entry:', error);
    }
  }

  private updateAvgResponseTime(patternName: string, responseTime: number): void {
    const stats = this.metrics.patternStats[patternName];
    const totalTime = stats.avgResponseTime * (stats.requests - 1) + responseTime;
    stats.avgResponseTime = totalTime / stats.requests;
  }

  async has(key: string): Promise<boolean> {
    try {
      const layers = this.getOrderedLayers();
      
      for (const layer of layers) {
        if (await layer.cache.has(key)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const layers = this.getOrderedLayers();
      let deleted = false;
      
      // Delete from all layers
      const deletePromises = layers.map(async layer => {
        const layerDeleted = await layer.cache.delete(key);
        if (layerDeleted) {
          deleted = true;
        }
        return layerDeleted;
      });
      
      await Promise.all(deletePromises);
      
      if (deleted) {
        console.log('Advanced cache delete completed', { key });
      }
      
      return deleted;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async clear(layerName?: string): Promise<void> {
    try {
      if (layerName) {
        const layer = this.layers.get(layerName);
        if (layer) {
          await layer.cache.clear();
          console.log('Cache layer cleared', { layerName });
        }
      } else {
        // Clear all layers
        const clearPromises = Array.from(this.layers.values()).map(layer =>
          layer.cache.clear()
        );
        await Promise.all(clearPromises);
        
        // Reset metrics
        this.resetMetrics();
        
        console.log('All cache layers cleared');
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      const layers = this.getOrderedLayers();
      let totalDeleted = 0;
      
      const deletePromises = layers.map(async layer => {
        const deleted = await layer.cache.deleteByTag(tag);
        totalDeleted += deleted;
        return deleted;
      });
      
      await Promise.all(deletePromises);
      
      console.log('Cache invalidated by tag', { tag, totalDeleted });
      return totalDeleted;
    } catch (error) {
      this.handleError(error as Error);
      return 0;
    }
  }

  async invalidateByPattern(patternName: string): Promise<number> {
    try {
      const pattern = this.patterns.find(p => p.name === patternName);
      if (!pattern) {
        return 0;
      }

      const layers = this.getOrderedLayers();
      let totalDeleted = 0;
      
      for (const layer of layers) {
        const keys = await layer.cache.keys();
        const matchingKeys = keys.filter(key => pattern.keyPattern.test(key));
        
        for (const key of matchingKeys) {
          if (await layer.cache.delete(key)) {
            totalDeleted++;
          }
        }
      }
      
      console.log('Cache invalidated by pattern', { patternName, totalDeleted });
      return totalDeleted;
    } catch (error) {
      this.handleError(error as Error);
      return 0;
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options?: DistributedCacheOptions
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, { preferredLayer: options?.partition });
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

  async warmCache(entries: Array<{ key: string; factory: () => Promise<any> | any; options?: DistributedCacheOptions }>): Promise<void> {
    try {
      console.log('Starting cache warming', { entryCount: entries.length });
      
      const warmPromises = entries.map(async entry => {
        try {
          const value = await entry.factory();
          await this.set(entry.key, value, entry.options);
        } catch (error) {
          console.error(`Error warming cache for key ${entry.key}:`, error);
        }
      });
      
      await Promise.all(warmPromises);
      console.log('Cache warming completed');
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async getMetrics(): Promise<CacheMetrics> {
    try {
      // Update layer sizes
      for (const [layerName, layer] of this.layers.entries()) {
        const size = await layer.cache.size();
        this.metrics.layerStats[layerName].size = size;
        
        // Update hit rates
        const stats = this.metrics.layerStats[layerName];
        const total = stats.hits + stats.misses;
        stats.hitRate = total > 0 ? stats.hits / total : 0;
      }
      
      // Update overall hit rate
      this.metrics.overallHitRate = this.metrics.totalRequests > 0 ? 
        this.metrics.totalHits / this.metrics.totalRequests : 0;
      
      return { ...this.metrics };
    } catch (error) {
      this.handleError(error as Error);
      return this.metrics;
    }
  }

  private resetMetrics(): void {
    this.metrics = {
      layerStats: {},
      patternStats: {},
      totalRequests: 0,
      totalHits: 0,
      overallHitRate: 0,
    };
    
    // Reinitialize layer stats
    for (const layerName of this.layers.keys()) {
      this.metrics.layerStats[layerName] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
      };
    }
    
    // Reinitialize pattern stats
    for (const pattern of this.patterns) {
      this.metrics.patternStats[pattern.name] = {
        requests: 0,
        hits: 0,
        avgResponseTime: 0,
      };
    }
  }

  async enableLayer(layerName: string): Promise<boolean> {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.enabled = true;
      console.log('Cache layer enabled', { layerName });
      return true;
    }
    return false;
  }

  async disableLayer(layerName: string): Promise<boolean> {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.enabled = false;
      console.log('Cache layer disabled', { layerName });
      return true;
    }
    return false;
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const metrics = await this.getMetrics();
    const layerHealth: Record<string, any> = {};
    
    for (const [name, layer] of this.layers.entries()) {
      layerHealth[name] = await layer.cache.healthCheck();
    }
    
    return {
      status: 'healthy',
      details: {
        service: 'AdvancedCacheService',
        initialized: this.initialized,
        layerCount: this.layers.size,
        patternCount: this.patterns.length,
        metrics,
        layerHealth,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down AdvancedCacheService');
    
    // Shutdown all cache layers
    const shutdownPromises = Array.from(this.layers.values()).map(layer =>
      layer.cache.shutdown()
    );
    
    await Promise.all(shutdownPromises);
    
    this.layers.clear();
    this.patterns = [];
    this.resetMetrics();
    this.initialized = false;
  }
}
