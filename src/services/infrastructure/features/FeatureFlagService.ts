import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  conditions?: {
    userIds?: string[];
    userGroups?: string[];
    deviceTypes?: string[];
    platforms?: string[];
    appVersions?: string[];
    countries?: string[];
    customAttributes?: Record<string, any>;
  };
  variants?: {
    [key: string]: {
      weight: number;
      value: any;
    };
  };
  metadata?: {
    owner?: string;
    team?: string;
    jiraTicket?: string;
    expiresAt?: Date;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagEvaluation {
  flagKey: string;
  enabled: boolean;
  variant?: string;
  value?: any;
  reason: string;
  evaluatedAt: Date;
}

export interface UserContext {
  userId: string;
  userGroup?: string;
  deviceType?: string;
  platform?: string;
  appVersion?: string;
  country?: string;
  customAttributes?: Record<string, any>;
}

export interface FeatureFlagStats {
  totalFlags: number;
  enabledFlags: number;
  disabledFlags: number;
  expiredFlags: number;
  flagsByOwner: Record<string, number>;
  flagsByTeam: Record<string, number>;
  recentEvaluations: number; // Last hour
}

export class FeatureFlagService extends BaseService {
  private initialized = false;
  private flags: Map<string, FeatureFlag> = new Map();
  private evaluationCache: Map<string, FeatureFlagEvaluation> = new Map();
  private evaluationStats: Map<string, number> = new Map();

  constructor() {
    super('FeatureFlagService');
  }

  async init(): Promise<void> {
    console.log('Initializing FeatureFlagService');
    
    try {
      // Load existing feature flags (in a real implementation, this would be from database)
      await this.loadFeatureFlags();
      
      this.initialized = true;
      console.log('FeatureFlagService initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async loadFeatureFlags(): Promise<void> {
    // Mock data - in real implementation, load from database
    const mockFlags: FeatureFlag[] = [
      {
        id: 'flag_1',
        name: 'New Journey UI',
        key: 'new_journey_ui',
        description: 'Enable the new journey planning interface',
        enabled: true,
        rolloutPercentage: 50,
        conditions: {
          userGroups: ['beta_testers'],
          platforms: ['ios', 'android'],
        },
        metadata: {
          owner: 'frontend-team',
          team: 'mobile',
          expiresAt: new Date('2024-12-31'),
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: 'flag_2',
        name: 'Enhanced Location Tracking',
        key: 'enhanced_location_tracking',
        description: 'Enable more accurate location tracking with additional sensors',
        enabled: true,
        rolloutPercentage: 25,
        conditions: {
          deviceTypes: ['mobile'],
          appVersions: ['1.2.0', '1.3.0'],
        },
        variants: {
          control: { weight: 50, value: false },
          enhanced: { weight: 50, value: true },
        },
        metadata: {
          owner: 'backend-team',
          team: 'location',
        },
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: 'flag_3',
        name: 'Premium Features',
        key: 'premium_features',
        description: 'Enable premium subscription features',
        enabled: false,
        rolloutPercentage: 0,
        metadata: {
          owner: 'product-team',
          team: 'monetization',
        },
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
      },
    ];

    for (const flag of mockFlags) {
      this.flags.set(flag.key, flag);
    }

    console.log(`Loaded ${mockFlags.length} feature flags`);
  }

  async createFlag(flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    try {
      // Check if flag key already exists
      if (this.flags.has(flagData.key)) {
        throw new Error(`Feature flag with key '${flagData.key}' already exists`);
      }

      // Validate rollout percentage
      if (flagData.rolloutPercentage < 0 || flagData.rolloutPercentage > 100) {
        throw new Error('Rollout percentage must be between 0 and 100');
      }

      // Validate variants weights
      if (flagData.variants) {
        const totalWeight = Object.values(flagData.variants).reduce((sum, variant) => sum + variant.weight, 0);
        if (totalWeight !== 100) {
          throw new Error('Variant weights must sum to 100');
        }
      }

      const flag: FeatureFlag = {
        ...flagData,
        id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.flags.set(flag.key, flag);

      console.log('Feature flag created', { flagId: flag.id, key: flag.key });
      return flag;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getFlag(key: string): Promise<FeatureFlag | null> {
    try {
      return this.flags.get(key) || null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async updateFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | null> {
    try {
      const flag = this.flags.get(key);
      if (!flag) {
        return null;
      }

      // Validate rollout percentage if provided
      if (updates.rolloutPercentage !== undefined) {
        if (updates.rolloutPercentage < 0 || updates.rolloutPercentage > 100) {
          throw new Error('Rollout percentage must be between 0 and 100');
        }
      }

      // Validate variants weights if provided
      if (updates.variants) {
        const totalWeight = Object.values(updates.variants).reduce((sum, variant) => sum + variant.weight, 0);
        if (totalWeight !== 100) {
          throw new Error('Variant weights must sum to 100');
        }
      }

      const updatedFlag: FeatureFlag = {
        ...flag,
        ...updates,
        updatedAt: new Date(),
      };

      this.flags.set(key, updatedFlag);

      // Clear evaluation cache for this flag
      this.clearFlagCache(key);

      console.log('Feature flag updated', { key });
      return updatedFlag;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async deleteFlag(key: string): Promise<boolean> {
    try {
      const flag = this.flags.get(key);
      if (!flag) {
        return false;
      }

      this.flags.delete(key);
      this.clearFlagCache(key);

      console.log('Feature flag deleted', { key });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async evaluateFlag(key: string, userContext: UserContext): Promise<FeatureFlagEvaluation> {
    try {
      const cacheKey = `${key}:${userContext.userId}`;
      
      // Check cache first (with 5-minute TTL)
      const cached = this.evaluationCache.get(cacheKey);
      if (cached && (Date.now() - cached.evaluatedAt.getTime()) < 5 * 60 * 1000) {
        return cached;
      }

      const flag = this.flags.get(key);
      
      if (!flag) {
        const evaluation: FeatureFlagEvaluation = {
          flagKey: key,
          enabled: false,
          reason: 'Flag not found',
          evaluatedAt: new Date(),
        };
        this.evaluationCache.set(cacheKey, evaluation);
        return evaluation;
      }

      // Check if flag is globally disabled
      if (!flag.enabled) {
        const evaluation: FeatureFlagEvaluation = {
          flagKey: key,
          enabled: false,
          reason: 'Flag disabled',
          evaluatedAt: new Date(),
        };
        this.evaluationCache.set(cacheKey, evaluation);
        return evaluation;
      }

      // Check if flag has expired
      if (flag.metadata?.expiresAt && flag.metadata.expiresAt < new Date()) {
        const evaluation: FeatureFlagEvaluation = {
          flagKey: key,
          enabled: false,
          reason: 'Flag expired',
          evaluatedAt: new Date(),
        };
        this.evaluationCache.set(cacheKey, evaluation);
        return evaluation;
      }

      // Check conditions
      if (!this.evaluateConditions(flag, userContext)) {
        const evaluation: FeatureFlagEvaluation = {
          flagKey: key,
          enabled: false,
          reason: 'Conditions not met',
          evaluatedAt: new Date(),
        };
        this.evaluationCache.set(cacheKey, evaluation);
        return evaluation;
      }

      // Check rollout percentage
      if (!this.evaluateRollout(flag, userContext)) {
        const evaluation: FeatureFlagEvaluation = {
          flagKey: key,
          enabled: false,
          reason: 'Not in rollout percentage',
          evaluatedAt: new Date(),
        };
        this.evaluationCache.set(cacheKey, evaluation);
        return evaluation;
      }

      // Determine variant if applicable
      let variant: string | undefined;
      let value: any = true;

      if (flag.variants) {
        const selectedVariant = this.selectVariant(flag, userContext);
        variant = selectedVariant.name;
        value = selectedVariant.value;
      }

      const evaluation: FeatureFlagEvaluation = {
        flagKey: key,
        enabled: true,
        variant,
        value,
        reason: 'Flag enabled',
        evaluatedAt: new Date(),
      };

      // Cache the evaluation
      this.evaluationCache.set(cacheKey, evaluation);

      // Update stats
      this.evaluationStats.set(key, (this.evaluationStats.get(key) || 0) + 1);

      return evaluation;
    } catch (error) {
      this.handleError(error as Error);
      return {
        flagKey: key,
        enabled: false,
        reason: 'Evaluation error',
        evaluatedAt: new Date(),
      };
    }
  }

  private evaluateConditions(flag: FeatureFlag, userContext: UserContext): boolean {
    const conditions = flag.conditions;
    if (!conditions) {
      return true;
    }

    // Check user IDs
    if (conditions.userIds && !conditions.userIds.includes(userContext.userId)) {
      return false;
    }

    // Check user groups
    if (conditions.userGroups && userContext.userGroup && !conditions.userGroups.includes(userContext.userGroup)) {
      return false;
    }

    // Check device types
    if (conditions.deviceTypes && userContext.deviceType && !conditions.deviceTypes.includes(userContext.deviceType)) {
      return false;
    }

    // Check platforms
    if (conditions.platforms && userContext.platform && !conditions.platforms.includes(userContext.platform)) {
      return false;
    }

    // Check app versions
    if (conditions.appVersions && userContext.appVersion && !conditions.appVersions.includes(userContext.appVersion)) {
      return false;
    }

    // Check countries
    if (conditions.countries && userContext.country && !conditions.countries.includes(userContext.country)) {
      return false;
    }

    // Check custom attributes
    if (conditions.customAttributes && userContext.customAttributes) {
      for (const [key, value] of Object.entries(conditions.customAttributes)) {
        if (userContext.customAttributes[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateRollout(flag: FeatureFlag, userContext: UserContext): boolean {
    if (flag.rolloutPercentage === 100) {
      return true;
    }

    if (flag.rolloutPercentage === 0) {
      return false;
    }

    // Use consistent hashing based on user ID and flag key
    const hash = this.hashString(`${userContext.userId}:${flag.key}`);
    const percentage = hash % 100;
    
    return percentage < flag.rolloutPercentage;
  }

  private selectVariant(flag: FeatureFlag, userContext: UserContext): { name: string; value: any } {
    if (!flag.variants) {
      return { name: 'default', value: true };
    }

    // Use consistent hashing for variant selection
    const hash = this.hashString(`${userContext.userId}:${flag.key}:variant`);
    const percentage = hash % 100;

    let cumulativeWeight = 0;
    for (const [variantName, variant] of Object.entries(flag.variants)) {
      cumulativeWeight += variant.weight;
      if (percentage < cumulativeWeight) {
        return { name: variantName, value: variant.value };
      }
    }

    // Fallback to first variant
    const firstVariant = Object.entries(flag.variants)[0];
    return { name: firstVariant[0], value: firstVariant[1].value };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private clearFlagCache(key: string): void {
    const keysToDelete: string[] = [];
    for (const cacheKey of this.evaluationCache.keys()) {
      if (cacheKey.startsWith(`${key}:`)) {
        keysToDelete.push(cacheKey);
      }
    }
    keysToDelete.forEach(k => this.evaluationCache.delete(k));
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      return Array.from(this.flags.values()).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async getFlagsByOwner(owner: string): Promise<FeatureFlag[]> {
    try {
      return Array.from(this.flags.values())
        .filter(f => f.metadata?.owner === owner)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async getFlagsByTeam(team: string): Promise<FeatureFlag[]> {
    try {
      return Array.from(this.flags.values())
        .filter(f => f.metadata?.team === team)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async getFeatureFlagStats(): Promise<FeatureFlagStats> {
    try {
      const flags = Array.from(this.flags.values());
      const now = new Date();

      const stats: FeatureFlagStats = {
        totalFlags: flags.length,
        enabledFlags: flags.filter(f => f.enabled).length,
        disabledFlags: flags.filter(f => !f.enabled).length,
        expiredFlags: flags.filter(f => f.metadata?.expiresAt && f.metadata.expiresAt < now).length,
        flagsByOwner: {},
        flagsByTeam: {},
        recentEvaluations: 0,
      };

      // Count by owner
      flags.forEach(f => {
        const owner = f.metadata?.owner || 'unknown';
        stats.flagsByOwner[owner] = (stats.flagsByOwner[owner] || 0) + 1;
      });

      // Count by team
      flags.forEach(f => {
        const team = f.metadata?.team || 'unknown';
        stats.flagsByTeam[team] = (stats.flagsByTeam[team] || 0) + 1;
      });

      // Count recent evaluations (this would be more sophisticated in a real implementation)
      stats.recentEvaluations = Array.from(this.evaluationStats.values()).reduce((sum, count) => sum + count, 0);

      return stats;
    } catch (error) {
      this.handleError(error as Error);
      return {
        totalFlags: 0,
        enabledFlags: 0,
        disabledFlags: 0,
        expiredFlags: 0,
        flagsByOwner: {},
        flagsByTeam: {},
        recentEvaluations: 0,
      };
    }
  }

  async cleanupExpiredFlags(): Promise<number> {
    try {
      const now = new Date();
      const expiredFlags = Array.from(this.flags.values())
        .filter(f => f.metadata?.expiresAt && f.metadata.expiresAt < now);

      let deletedCount = 0;
      for (const flag of expiredFlags) {
        const success = await this.deleteFlag(flag.key);
        if (success) {
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} expired feature flags`);
      return deletedCount;
    } catch (error) {
      this.handleError(error as Error);
      return 0;
    }
  }

  // Convenience methods
  async isEnabled(key: string, userContext: UserContext): Promise<boolean> {
    const evaluation = await this.evaluateFlag(key, userContext);
    return evaluation.enabled;
  }

  async getVariant(key: string, userContext: UserContext): Promise<string | null> {
    const evaluation = await this.evaluateFlag(key, userContext);
    return evaluation.variant || null;
  }

  async getValue(key: string, userContext: UserContext, defaultValue: any = false): Promise<any> {
    const evaluation = await this.evaluateFlag(key, userContext);
    return evaluation.enabled ? (evaluation.value !== undefined ? evaluation.value : true) : defaultValue;
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const stats = await this.getFeatureFlagStats();
    
    return {
      status: 'healthy',
      details: {
        service: 'FeatureFlagService',
        initialized: this.initialized,
        cacheSize: this.evaluationCache.size,
        stats,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down FeatureFlagService');
    
    this.flags.clear();
    this.evaluationCache.clear();
    this.evaluationStats.clear();
    this.initialized = false;
  }
}