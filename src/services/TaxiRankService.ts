import { sql } from "../config/db";
import type {
  CreateTaxiRankRequest,
  TaxiRank,
  TaxiRankSearchParams,
  UpdateTaxiRankRequest,
} from "../database/shared/models";
import { BaseService } from "./BaseService";

export class TaxiRankService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ TaxiRankService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 TaxiRankService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const [result] = await sql`SELECT 1 as health_check`;
      return { status: "healthy", details: { database: "connected" } };
    } catch (error: any) {
      return {
        status: "unhealthy",
        details: { error: error?.message || "Unknown error" },
      };
    }
  }

  async createRank(data: CreateTaxiRankRequest): Promise<TaxiRank> {
    return this.executeQuery(async () => {
      const [rank] = await sql`
        INSERT INTO taxi_ranks (
          name, latitude, longitude, address, city, province,
          description, capacity, is_active, operating_hours,
          contact_number, facilities, accessibility_features,
          fare_structure, created_at, updated_at
        )
        VALUES (
          ${data.name}, ${data.latitude}, ${data.longitude}, ${data.address},
          ${data.city}, ${data.province}, ${data.description || null},
          ${data.capacity || 10}, ${data.is_active ?? true}, 
          ${JSON.stringify(data.operating_hours || {})}, ${data.contact_number || null},
          ${JSON.stringify(data.facilities || [])}, ${JSON.stringify(data.accessibility_features || [])},
          ${JSON.stringify(data.fare_structure || {})}, NOW(), NOW()
        )
        RETURNING *
      `;
      return rank as TaxiRank;
    });
  }

  async getRankById(id: number): Promise<TaxiRank | null> {
    return this.executeQuery(async () => {
      const [rank] = await sql`
        SELECT * FROM taxi_ranks 
        WHERE id = ${id} AND is_active = true
      `;
      return (rank as TaxiRank) || null;
    });
  }

  async getRanks(
    params: TaxiRankSearchParams,
  ): Promise<{ ranks: TaxiRank[]; total: number }> {
    return this.executeQuery(async () => {
      const {
        limit = 20,
        offset = 0,
        city,
        province,
        latitude,
        longitude,
        radius,
        is_active = true,
      } = params;

      const whereConditions = [`is_active = ${is_active}`];
      const queryParams: any[] = [];

      if (city) {
        whereConditions.push(`city ILIKE $${queryParams.length + 1}`);
        queryParams.push(`%${city}%`);
      }

      if (province) {
        whereConditions.push(`province ILIKE $${queryParams.length + 1}`);
        queryParams.push(`%${province}%`);
      }

      if (latitude && longitude && radius) {
        const radiusKm = radius / 1000;
        whereConditions.push(`
          (6371 * acos(
            cos(radians(${latitude}::float)) * cos(radians(latitude))
            * cos(radians(longitude) - radians(${longitude}::float))
            + sin(radians(${latitude}::float)) * sin(radians(latitude))
          )) < ${radiusKm}
        `);
      }

      const whereClause = whereConditions.join(" AND ");

      const ranks = await sql`
        SELECT *,
               CASE
                 WHEN ${latitude || null}::float IS NOT NULL AND ${longitude || null}::float IS NOT NULL THEN
                   (6371 * acos(
                       cos(radians(${latitude || null}::float)) * cos(radians(latitude))
                         * cos(radians(longitude) - radians(${longitude || null}::float))
                         + sin(radians(${latitude || null}::float)) * sin(radians(latitude))
                           ))
                 ELSE NULL
                 END as distance
        FROM taxi_ranks
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY 
          CASE WHEN ${latitude || null}::float IS NOT NULL AND ${longitude || null}::float IS NOT NULL 
               THEN distance 
               ELSE 0 END ASC,
          created_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM taxi_ranks
        WHERE ${sql.unsafe(whereClause)}
      `;

      return { ranks: ranks as TaxiRank[], total: Number.parseInt(count) };
    });
  }

  async updateRank(
    id: number,
    updateData: UpdateTaxiRankRequest,
  ): Promise<TaxiRank | null> {
    return this.executeQuery(async () => {
      const updateFields = Object.keys(updateData)
        .filter(
          (key) => updateData[key as keyof UpdateTaxiRankRequest] !== undefined,
        )
        .map((key, index) => `${key} = $${index + 2}`)
        .join(", ");

      if (!updateFields) {
        throw new Error("No fields to update");
      }

      const values = Object.keys(updateData)
        .filter(
          (key) => updateData[key as keyof UpdateTaxiRankRequest] !== undefined,
        )
        .map((key) => updateData[key as keyof UpdateTaxiRankRequest]);

      const [rank] = await sql`
        UPDATE taxi_ranks 
        SET ${sql.unsafe(updateFields)}, updated_at = NOW()
        WHERE id = ${id} AND is_active = true
        RETURNING *
      `;
      return (rank as TaxiRank) || null;
    });
  }

  async deleteRank(id: number): Promise<boolean> {
    return this.executeQuery(async () => {
      const [result] = await sql`
        UPDATE taxi_ranks 
        SET is_active = false, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id
      `;
      return !!result;
    });
  }

  async getNearbyRanks(
    latitude: number,
    longitude: number,
    radius = 5000,
    limit = 50,
  ): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      try {
        const radiusKm = radius / 1000;
        // Use LEAST and GREATEST to clamp the value to [-1, 1] to prevent NaN from acos
        const ranks = await sql`
          SELECT *,
                (6371 * acos(
                    LEAST(1, GREATEST(-1, 
                      cos(radians(${latitude}::float)) * cos(radians(latitude))
                      * cos(radians(longitude) - radians(${longitude}::float))
                      + sin(radians(${latitude}::float)) * sin(radians(latitude))
                    ))
                )) as distance
          FROM taxi_ranks
          WHERE is_active = true
            AND (6371 * acos(
                  LEAST(1, GREATEST(-1, 
                    cos(radians(${latitude}::float)) * cos(radians(latitude))
                    * cos(radians(longitude) - radians(${longitude}::float))
                    + sin(radians(${latitude}::float)) * sin(radians(latitude))
                  ))
                )) < ${radiusKm}
          ORDER BY (6371 * acos(
                  LEAST(1, GREATEST(-1, 
                    cos(radians(${latitude}::float)) * cos(radians(latitude))
                    * cos(radians(longitude) - radians(${longitude}::float))
                    + sin(radians(${latitude}::float)) * sin(radians(latitude))
                  ))
                )) ASC
          LIMIT ${limit}
        `;
        return ranks as TaxiRank[];
      } catch (error) {
        console.error("Error in getNearbyRanks:", error);
        // Return empty array instead of throwing error
        return [];
      }
    });
  }

  async getRanksByCity(city: string): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      const ranks = await sql`
        SELECT * FROM taxi_ranks
        WHERE city ILIKE ${`%${city}%`} AND is_active = true
        ORDER BY name ASC
      `;
      return ranks as TaxiRank[];
    });
  }

  async getRanksByProvince(province: string): Promise<TaxiRank[]> {
    return this.executeQuery(async () => {
      const ranks = await sql`
        SELECT * FROM taxi_ranks
        WHERE province ILIKE ${`%${province}%`} AND is_active = true
        ORDER BY city ASC, name ASC
      `;
      return ranks as TaxiRank[];
    });
  }
}
