import { sql } from "../config/db";
import type {
  CreateHikingSignRequest,
  HikingSignSearchParams,
} from "../database/shared/models";
import type { HikingSign } from "../types/database.types";
import { BaseService } from "./BaseService";

export class HikingSignService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ HikingSignService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 HikingSignService shutdown");
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

  async createHikingSign(
    signData: CreateHikingSignRequest,
  ): Promise<HikingSign> {
    return this.executeQuery(async () => {
      const [sign] = await sql`
        INSERT INTO hiking_signs (
          user_id, image_url, description, latitude, longitude, address,
          from_location, to_location, fare_amount, sign_type,
          verification_count, is_verified, metadata, created_at, updated_at
        )
        VALUES (
                 ${signData.user_id || null}, ${signData.image_url}, ${signData.description || null},
                 ${signData.latitude}, ${signData.longitude}, ${signData.address || null},
                 ${signData.from_location || null}, ${signData.to_location || null},
                 ${signData.fare_amount || null}, ${signData.sign_type || "fare_board"},
                 0, false, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
               )
          RETURNING *
      `;
      return sign as HikingSign;
    });
  }

  async getHikingSignById(id: number): Promise<HikingSign | null> {
    return this.executeQuery(async () => {
      const [sign] = await sql`
        SELECT hs.*, u.first_name, u.last_name
        FROM hiking_signs hs
               LEFT JOIN users u ON hs.user_id = u.id
        WHERE hs.id = ${id}
      `;
      return (sign as HikingSign) || null;
    });
  }

  async getHikingSigns(
    params: HikingSignSearchParams,
  ): Promise<{ signs: HikingSign[]; total: number }> {
    return this.executeQuery(async () => {
      const {
        limit = 20,
        offset = 0,
        latitude,
        longitude,
        radius,
        is_verified,
        user_id,
      } = params;

      const whereConditions = ["1=1"];
      const queryParams: any[] = [];

      if (
        latitude !== undefined &&
        longitude !== undefined &&
        radius !== undefined
      ) {
        const radiusKm = radius / 1000;
        whereConditions.push(`
          (6371 * acos(
            cos(radians(${latitude})) * cos(radians(hs.latitude))
            * cos(radians(hs.longitude) - radians(${longitude}))
            + sin(radians(${latitude})) * sin(radians(hs.latitude))
          )) < ${radiusKm}
        `);
      }

      if (is_verified !== undefined) {
        whereConditions.push(`hs.is_verified = $${queryParams.length + 1}`);
        queryParams.push(is_verified);
      }

      if (user_id) {
        whereConditions.push(`hs.user_id = $${queryParams.length + 1}`);
        queryParams.push(user_id);
      }

      const whereClause = whereConditions.join(" AND ");

      const signs = await sql`
        SELECT hs.*, u.first_name, u.last_name,
               CASE
                 WHEN ${latitude} IS NOT NULL AND ${longitude} IS NOT NULL THEN
                   (6371 * acos(
                       cos(radians(${latitude})) * cos(radians(hs.latitude))
                         * cos(radians(hs.longitude) - radians(${longitude}))
                         + sin(radians(${latitude})) * sin(radians(hs.latitude))
                           ))
                 ELSE NULL
                 END as distance
        FROM hiking_signs hs
               LEFT JOIN users u ON hs.user_id = u.id
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY hs.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM hiking_signs hs
        WHERE ${sql.unsafe(whereClause)}
      `;

      return { signs: signs as HikingSign[], total: Number.parseInt(count) };
    });
  }

  async getNearbyHikingSigns(
    latitude: number,
    longitude: number,
    radius = 5000,
  ): Promise<HikingSign[]> {
    return this.executeQuery(async () => {
      const radiusKm = radius / 1000;

      const signs = await sql`
        SELECT hs.*, u.first_name, u.last_name,
               (6371 * acos(
                   cos(radians(${latitude})) * cos(radians(hs.latitude))
                     * cos(radians(hs.longitude) - radians(${longitude}))
                     + sin(radians(${latitude})) * sin(radians(hs.latitude))
                       )) as distance
        FROM hiking_signs hs
               LEFT JOIN users u ON hs.user_id = u.id
        WHERE (6371 * acos(
            cos(radians(${latitude})) * cos(radians(hs.latitude))
              * cos(radians(hs.longitude) - radians(${longitude}))
              + sin(radians(${latitude})) * sin(radians(hs.latitude))
                      )) < ${radiusKm}
        ORDER BY distance ASC
          LIMIT 50
      `;
      return signs as HikingSign[];
    });
  }

  async updateHikingSign(
    id: number,
    updateData: Partial<CreateHikingSignRequest>,
  ): Promise<HikingSign | null> {
    return this.executeQuery(async () => {
      const updateFields = Object.keys(updateData)
        .filter(
          (key) =>
            updateData[key as keyof CreateHikingSignRequest] !== undefined,
        )
        .map((key, index) => `${key} = $${index + 2}`)
        .join(", ");

      if (!updateFields) {
        throw new Error("No fields to update");
      }

      const values = Object.keys(updateData)
        .filter(
          (key) =>
            updateData[key as keyof CreateHikingSignRequest] !== undefined,
        )
        .map((key) => updateData[key as keyof CreateHikingSignRequest]);

      const [sign] = await sql`
        UPDATE hiking_signs
        SET ${sql.unsafe(updateFields)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
          RETURNING *
      `;
      return (sign as HikingSign) || null;
    });
  }

  async deleteHikingSign(id: number): Promise<boolean> {
    return this.executeQuery(async () => {
      const [result] = await sql`
        DELETE FROM hiking_signs
        WHERE id = ${id}
          RETURNING id
      `;
      return !!result;
    });
  }

  async verifyHikingSign(
    id: number,
    verifiedBy: string,
  ): Promise<HikingSign | null> {
    return this.executeQuery(async () => {
      const [sign] = await sql`
        UPDATE hiking_signs
        SET is_verified = true,
            verification_date = CURRENT_TIMESTAMP,
            verification_count = verification_count + 1,
            last_updated_by = ${verifiedBy},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
          RETURNING *
      `;
      return (sign as HikingSign) || null;
    });
  }

  async getVerifiedSigns(): Promise<HikingSign[]> {
    return this.executeQuery(async () => {
      const signs = await sql`
        SELECT hs.*, u.first_name, u.last_name
        FROM hiking_signs hs
               LEFT JOIN users u ON hs.user_id = u.id
        WHERE hs.is_verified = true
        ORDER BY hs.verification_date DESC
      `;
      return signs as HikingSign[];
    });
  }

  async getSignsByLocation(
    fromLocation: string,
    toLocation: string,
  ): Promise<HikingSign[]> {
    return this.executeQuery(async () => {
      const signs = await sql`
        SELECT hs.*, u.first_name, u.last_name
        FROM hiking_signs hs
               LEFT JOIN users u ON hs.user_id = u.id
        WHERE (hs.from_location ILIKE ${`%${fromLocation}%`} OR hs.to_location ILIKE ${`%${toLocation}%`})
          AND hs.is_verified = true
        ORDER BY hs.created_at DESC
      `;
      return signs as HikingSign[];
    });
  }
}
