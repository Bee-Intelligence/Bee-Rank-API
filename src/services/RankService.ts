import { sql } from "../config/db";
import { BaseService } from "./BaseService";

interface TaxiRank {
  id: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  province: string;
  facilities?: any;
  is_active?: boolean;
  max_vehicles?: number;
  created_at?: Date;
  updated_at?: Date;
}

interface RankFilters {
  city?: string;
  province?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export class RankService extends BaseService {
  private notificationService: any = null;

  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    try {
      // Test database connection
      await sql`SELECT 1`;
      console.log("✅ RankService initialized");
    } catch (error) {
      console.error("Failed to initialize RankService:", error);
    }
  }

  async shutdown(): Promise<void> {
    console.log("🛑 RankService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      // Test database connection
      const result = await sql`SELECT COUNT(*) as count FROM taxi_ranks`;

      return {
        status: "healthy",
        details: {
          database: "connected",
          totalRanks: result[0]?.count || 0,
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

  async getAllRanks(filters?: RankFilters): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      let query = sql`SELECT * FROM taxi_ranks WHERE 1=1`;

      if (filters?.city) {
        query = sql`SELECT * FROM taxi_ranks WHERE city = ${filters.city}`;
      }

      if (filters?.province) {
        query = sql`SELECT * FROM taxi_ranks WHERE province = ${filters.province}`;
      }

      if (filters?.is_active !== undefined) {
        query = sql`SELECT * FROM taxi_ranks WHERE is_active = ${filters.is_active}`;
      }

      // Add ordering and limits
      query = sql`${query} ORDER BY name ASC`;

      if (filters?.limit) {
        query = sql`${query} LIMIT ${filters.limit}`;
      }

      if (filters?.offset) {
        query = sql`${query} OFFSET ${filters.offset}`;
      }

      const result = await query;
      return (Array.isArray(result) ? result : []) as TaxiRank[];
    });
  }

  async getRankById(id: number): Promise<TaxiRank | null> {
    return this.executeQuery(async () => {
      const result = await sql`
        SELECT * FROM taxi_ranks
        WHERE id = ${id}
      `;

      return result.length > 0 ? (result[0] as TaxiRank) : null;
    });
  }

  async createRank(
    rankData: Omit<TaxiRank, "id" | "created_at" | "updated_at">,
  ): Promise<TaxiRank> {
    return this.executeQuery(async () => {
      const [rank] = await sql`
        INSERT INTO taxi_ranks (
          name,
          description,
          latitude,
          longitude,
          address,
          city,
          province,
          facilities,
          is_active,
          max_vehicles
        )
        VALUES (
                 ${rankData.name},
                 ${rankData.description || null},
                 ${rankData.latitude},
                 ${rankData.longitude},
                 ${rankData.address},
                 ${rankData.city},
                 ${rankData.province},
                 ${JSON.stringify(rankData.facilities || {})},
                 ${rankData.is_active !== undefined ? rankData.is_active : true},
                 ${rankData.max_vehicles || 50}
               )
          RETURNING *
      `;

      const newRank = rank as TaxiRank;

      // Notify admins about new rank creation
      this.notifyAdmins("new_rank_created", {
        rankId: newRank.id,
        rankName: newRank.name,
        city: newRank.city,
        province: newRank.province,
      });

      return newRank;
    });
  }

  async updateRank(
    id: number,
    updates: Partial<TaxiRank>,
  ): Promise<TaxiRank | null> {
    return this.executeQuery(async () => {
      const [updatedRank] = await sql`
        UPDATE taxi_ranks
        SET
          name = COALESCE(${updates.name}, name),
          description = COALESCE(${updates.description}, description),
          latitude = COALESCE(${updates.latitude}, latitude),
          longitude = COALESCE(${updates.longitude}, longitude),
          address = COALESCE(${updates.address}, address),
          city = COALESCE(${updates.city}, city),
          province = COALESCE(${updates.province}, province),
          facilities = COALESCE(${updates.facilities ? JSON.stringify(updates.facilities) : null}, facilities),
          is_active = COALESCE(${updates.is_active}, is_active),
          max_vehicles = COALESCE(${updates.max_vehicles}, max_vehicles),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
          RETURNING *
      `;

      return updatedRank ? (updatedRank as TaxiRank) : null;
    });
  }

  async deleteRank(id: number): Promise<boolean> {
    return this.executeQuery(async () => {
      const result = await sql`
        DELETE FROM taxi_ranks
        WHERE id = ${id}
      `;

      return result.length > 0;
    });
  }

  async getNearbyRanks(
    latitude: number,
    longitude: number,
    radiusKm = 5,
  ): Promise<(TaxiRank & { distance: number })[]> {
    return this.executeQuery(async () => {
      // Validate inputs
      if (latitude < -90 || latitude > 90) {
        throw new Error("Invalid latitude: must be between -90 and 90");
      }
      if (longitude < -180 || longitude > 180) {
        throw new Error("Invalid longitude: must be between -180 and 180");
      }
      if (radiusKm <= 0) {
        throw new Error("Radius must be positive");
      }

      const result = await sql`
        SELECT *,
               (6371 * acos(
                   cos(radians(${latitude})) * cos(radians(latitude))
                     * cos(radians(longitude) - radians(${longitude}))
                     + sin(radians(${latitude})) * sin(radians(latitude))
                       )) AS distance
        FROM taxi_ranks
        WHERE is_active = true
        HAVING distance < ${radiusKm}
        ORDER BY distance
          LIMIT 50
      `;

      return result as (TaxiRank & { distance: number })[];
    });
  }

  async searchRanks(query: string): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const searchTerm = `%${query.trim().toLowerCase()}%`;

      const result = await sql`
        SELECT * FROM taxi_ranks
        WHERE (
          LOWER(name) LIKE ${searchTerm}
            OR LOWER(address) LIKE ${searchTerm}
            OR LOWER(city) LIKE ${searchTerm}
            OR LOWER(province) LIKE ${searchTerm}
          )
          AND is_active = true
        ORDER BY
          CASE
            WHEN LOWER(name) LIKE ${searchTerm} THEN 1
            WHEN LOWER(city) LIKE ${searchTerm} THEN 2
            ELSE 3
            END,
          name ASC
          LIMIT 20
      `;

      return result as TaxiRank[];
    });
  }

  async getPopularCities(): Promise<string[]> {
    return this.executeQuery(async () => {
      const result = await sql`
        SELECT DISTINCT city
        FROM taxi_ranks
        WHERE is_active = true AND city IS NOT NULL
        ORDER BY city ASC
      `;

      return result.map((row: any) => row.city) as string[];
    });
  }

  async getPopularProvinces(): Promise<string[]> {
    return this.executeQuery(async () => {
      const result = await sql`
        SELECT DISTINCT province
        FROM taxi_ranks
        WHERE is_active = true AND province IS NOT NULL
        ORDER BY province ASC
      `;

      return result.map((row: any) => row.province) as string[];
    });
  }

  async getRankStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byProvince: Record<string, number>;
    byCity: Record<string, number>;
  }> {
    return this.executeQuery(async () => {
      // Get total counts
      const [totalResult] = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE is_active = false) as inactive
        FROM taxi_ranks
      `;

      // Get counts by province
      const provinceResult = await sql`
        SELECT province, COUNT(*) as count
        FROM taxi_ranks
        WHERE province IS NOT NULL
        GROUP BY province
        ORDER BY count DESC
      `;

      // Get counts by city
      const cityResult = await sql`
        SELECT city, COUNT(*) as count
        FROM taxi_ranks
        WHERE city IS NOT NULL
        GROUP BY city
        ORDER BY count DESC
          LIMIT 20
      `;

      const byProvince: Record<string, number> = {};
      provinceResult.forEach((row: any) => {
        byProvince[row.province] = Number.parseInt(row.count);
      });

      const byCity: Record<string, number> = {};
      cityResult.forEach((row: any) => {
        byCity[row.city] = Number.parseInt(row.count);
      });

      return {
        total: Number.parseInt(totalResult.total),
        active: Number.parseInt(totalResult.active),
        inactive: Number.parseInt(totalResult.inactive),
        byProvince,
        byCity,
      };
    });
  }

  async toggleRankStatus(id: number): Promise<TaxiRank | null> {
    return this.executeQuery(async () => {
      const [updatedRank] = await sql`
        UPDATE taxi_ranks
        SET
          is_active = NOT is_active,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
          RETURNING *
      `;

      return updatedRank ? (updatedRank as TaxiRank) : null;
    });
  }

  async getRanksWithinBounds(
    northEast: { lat: number; lng: number },
    southWest: { lat: number; lng: number },
  ): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      const result = await sql`
        SELECT * FROM taxi_ranks
        WHERE latitude BETWEEN ${southWest.lat} AND ${northEast.lat}
          AND longitude BETWEEN ${southWest.lng} AND ${northEast.lng}
          AND is_active = true
        ORDER BY name
          LIMIT 100
      `;

      return result as TaxiRank[];
    });
  }

  // Additional utility methods
  async getRecentRanks(limit = 10): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      const result = await sql`
        SELECT * FROM taxi_ranks
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return result as TaxiRank[];
    });
  }

  async getRanksByCity(city: string): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      const result = await sql`
        SELECT * FROM taxi_ranks
        WHERE LOWER(city) = LOWER(${city})
        AND is_active = true
        ORDER BY name ASC
      `;

      return result as TaxiRank[];
    });
  }

  async getRanksByProvince(province: string): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      const result = await sql`
        SELECT * FROM taxi_ranks
        WHERE LOWER(province) = LOWER(${province})
        AND is_active = true
        ORDER BY city ASC, name ASC
      `;

      return result as TaxiRank[];
    });
  }

  async updateRankFacilities(
    id: number,
    facilities: any,
  ): Promise<TaxiRank | null> {
    return this.executeQuery(async () => {
      const [updatedRank] = await sql`
        UPDATE taxi_ranks 
        SET 
          facilities = ${JSON.stringify(facilities)},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

      return updatedRank ? (updatedRank as TaxiRank) : null;
    });
  }

  async batchUpdateRanks(
    updates: { id: number; data: Partial<TaxiRank> }[],
  ): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      const updatedRanks: TaxiRank[] = [];

      for (const update of updates) {
        const result = await this.updateRank(update.id, update.data);
        if (result) {
          updatedRanks.push(result);
        }
      }

      return updatedRanks;
    });
  }

  // Utility method to set notification service
  setNotificationService(notificationService: any): void {
    this.notificationService = notificationService;
  }

  private async notifyAdmins(eventType: string, data: any): Promise<void> {
    try {
      if (!this.notificationService) {
        console.log(`Notification (${eventType}):`, data);
        return;
      }

      // Get admin users
      const admins = await sql`
        SELECT * FROM users 
        WHERE role = 'admin' AND is_active = true
      `;

      admins.forEach((admin: any) => {
        if (
          this.notificationService &&
          typeof this.notificationService.send === "function"
        ) {
          this.notificationService.send({
            type: eventType,
            recipient: admin.id,
            data: data,
          });
        }
      });
    } catch (error) {
      console.error("Failed to notify admins:", error);
    }
  }

  // Method to ensure taxi_ranks table exists
  async ensureTableExists(): Promise<void> {
    return this.executeQuery(async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS taxi_ranks (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          address TEXT NOT NULL,
          city VARCHAR(100) NOT NULL,
          province VARCHAR(100) NOT NULL,
          facilities JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          max_vehicles INTEGER DEFAULT 50,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create indexes for better performance
      await sql`
        CREATE INDEX IF NOT EXISTS idx_taxi_ranks_location 
        ON taxi_ranks(latitude, longitude)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_taxi_ranks_city 
        ON taxi_ranks(city)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_taxi_ranks_province 
        ON taxi_ranks(province)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_taxi_ranks_active 
        ON taxi_ranks(is_active)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_taxi_ranks_created_at 
        ON taxi_ranks(created_at)
      `;
    });
  }
}
