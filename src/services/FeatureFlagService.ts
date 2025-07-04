import { sql } from "../config/db";
import { BaseService } from "./BaseService";

interface FeatureRules {
  userPercentage?: number;
  allowedUsers?: string[];
  allowedRoles?: string[];
  startDate?: string;
  endDate?: string;
  conditions?: Record<string, any>;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules?: FeatureRules;
  created_at?: Date;
  updated_at?: Date;
}

export class FeatureFlagService extends BaseService {
  private features: Map<string, Feature> = new Map();
  private cache: Map<string, boolean> = new Map();

  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    try {
      await this.loadFeatures();
      console.log("✅ FeatureFlagService initialized");
    } catch (error) {
      console.error("Failed to initialize FeatureFlagService:", error);
    }
  }

  async shutdown(): Promise<void> {
    this.features.clear();
    this.cache.clear();
    console.log("🛑 FeatureFlagService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      // Test database connection
      await sql`SELECT 1`;

      return {
        status: "healthy",
        details: {
          featuresLoaded: this.features.size,
          cacheSize: this.cache.size,
          database: "connected",
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        status: "unhealthy",
        details: { error: errorMessage },
      };
    }
  }

  private async loadFeatures(): Promise<void> {
    return this.executeQuery(async () => {
      try {
        const features = await sql`SELECT * FROM features`;

        this.features.clear();
        features.forEach((feature: any) => {
          // Parse rules if they exist and are stored as JSON string
          let parsedRules: FeatureRules | undefined;
          if (feature.rules) {
            try {
              parsedRules =
                typeof feature.rules === "string"
                  ? JSON.parse(feature.rules)
                  : feature.rules;
            } catch (error) {
              console.warn(
                `Failed to parse rules for feature ${feature.id}:`,
                error,
              );
              parsedRules = undefined;
            }
          }

          this.features.set(feature.id, {
            id: feature.id,
            name: feature.name,
            description: feature.description,
            enabled: feature.enabled,
            rules: parsedRules,
            created_at: feature.created_at,
            updated_at: feature.updated_at,
          });
        });

        // Clear cache when features are reloaded
        this.cache.clear();
      } catch (error) {
        // If features table doesn't exist, create it
        if (
          error instanceof Error &&
          error.message.includes("does not exist")
        ) {
          await this.createFeaturesTable();
          console.log("Created features table");
        } else {
          throw error;
        }
      }
    });
  }

  private async createFeaturesTable(): Promise<void> {
    await sql`
      CREATE TABLE IF NOT EXISTS features (
                                            id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        enabled BOOLEAN DEFAULT false,
        rules JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
  }

  async isEnabled(
    featureId: string,
    context?: {
      userId?: string;
      userRole?: string;
      attributes?: Record<string, any>;
    },
  ): Promise<boolean> {
    return this.executeQuery(async () => {
      const feature = this.features.get(featureId);
      if (!feature) return false;

      if (!feature.enabled) return false;

      const cacheKey = this.getCacheKey(featureId, context);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      const isEnabled = await this.evaluateRules(feature, context, featureId);
      this.cache.set(cacheKey, isEnabled);

      return isEnabled;
    });
  }

  private getCacheKey(
    featureId: string,
    context?: Record<string, any>,
  ): string {
    return `${featureId}:${JSON.stringify(context || {})}`;
  }

  private async evaluateRules(
    feature: Feature,
    context?: {
      userId?: string;
      userRole?: string;
      attributes?: Record<string, any>;
    },
    featureId?: string,
  ): Promise<boolean> {
    if (!feature.rules) return true;

    const {
      userPercentage,
      allowedUsers,
      allowedRoles,
      startDate,
      endDate,
      conditions,
    } = feature.rules;

    // Check date constraints
    if (startDate && new Date(startDate) > new Date()) {
      return false;
    }

    if (endDate && new Date(endDate) < new Date()) {
      return false;
    }

    // Check User whitelist
    if (allowedUsers && context?.userId) {
      if (!allowedUsers.includes(context.userId)) {
        return false;
      }
    }

    // Check role whitelist
    if (allowedRoles && context?.userRole) {
      if (!allowedRoles.includes(context.userRole)) {
        return false;
      }
    }

    // Check percentage rollout
    if (userPercentage !== undefined && context?.userId) {
      const hashInput = context.userId + (featureId || feature.id);
      const hash = this.hashString(hashInput);
      if (hash % 100 >= userPercentage) {
        return false;
      }
    }

    // Check custom conditions
    if (conditions && context?.attributes) {
      for (const [key, value] of Object.entries(conditions)) {
        if (context.attributes[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async updateFeature(feature: Feature): Promise<void> {
    return this.executeQuery(async () => {
      await sql`
        INSERT INTO features (
          id,
          name,
          description,
          enabled,
          rules,
          updated_at
        ) VALUES (
                   ${feature.id},
                   ${feature.name},
                   ${feature.description},
                   ${feature.enabled},
                   ${JSON.stringify(feature.rules || null)},
                   CURRENT_TIMESTAMP
                 )
          ON CONFLICT (id) DO UPDATE
                                SET
                                  name = EXCLUDED.name,
                                description = EXCLUDED.description,
                                enabled = EXCLUDED.enabled,
                                rules = EXCLUDED.rules,
                                updated_at = CURRENT_TIMESTAMP
      `;

      this.features.set(feature.id, feature);
      this.cache.clear();
    });
  }

  async createFeature(
    feature: Omit<Feature, "created_at" | "updated_at">,
  ): Promise<Feature> {
    return this.executeQuery(async () => {
      const [createdFeature] = await sql`
        INSERT INTO features (
          id,
          name,
          description,
          enabled,
          rules
        ) VALUES (
                   ${feature.id},
                   ${feature.name},
                   ${feature.description},
                   ${feature.enabled},
                   ${JSON.stringify(feature.rules || null)}
                 )
          RETURNING *
      `;

      const newFeature: Feature = {
        ...feature,
        created_at: createdFeature.created_at,
        updated_at: createdFeature.updated_at,
      };

      this.features.set(feature.id, newFeature);
      this.cache.clear();

      return newFeature;
    });
  }

  async deleteFeature(featureId: string): Promise<boolean> {
    return this.executeQuery(async () => {
      const result = await sql`
        DELETE FROM features
        WHERE id = ${featureId}
      `;

      // Check if any rows were affected
      if (result.length === 0 || (result as any).rowCount > 0) {
        this.features.delete(featureId);
        this.cache.clear();
        return true;
      }

      return false;
    });
  }

  async getFeature(featureId: string): Promise<Feature | null> {
    return this.features.get(featureId) || null;
  }

  async getAllFeatures(): Promise<Feature[]> {
    return Array.from(this.features.values());
  }

  async reloadFeatures(): Promise<void> {
    await this.loadFeatures();
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Utility method to check multiple features at once
  async areEnabled(
    featureIds: string[],
    context?: {
      userId?: string;
      userRole?: string;
      attributes?: Record<string, any>;
    },
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const featureId of featureIds) {
      results[featureId] = await this.isEnabled(featureId, context);
    }

    return results;
  }

  // Get feature statistics
  async getFeatureStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    withRules: number;
  }> {
    const features = Array.from(this.features.values());

    return {
      total: features.length,
      enabled: features.filter((f) => f.enabled).length,
      disabled: features.filter((f) => !f.enabled).length,
      withRules: features.filter(
        (f) => f.rules && Object.keys(f.rules).length > 0,
      ).length,
    };
  }

  // Helper method to enable/disable feature quickly
  async toggleFeature(featureId: string): Promise<boolean> {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    const updatedFeature = { ...feature, enabled: !feature.enabled };
    await this.updateFeature(updatedFeature);
    return updatedFeature.enabled;
  }

  // Helper method to set percentage rollout
  async setPercentageRollout(
    featureId: string,
    percentage: number,
  ): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error("Percentage must be between 0 and 100");
    }

    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    const updatedFeature = {
      ...feature,
      rules: {
        ...feature.rules,
        userPercentage: percentage,
      },
    };

    await this.updateFeature(updatedFeature);
  }
}
