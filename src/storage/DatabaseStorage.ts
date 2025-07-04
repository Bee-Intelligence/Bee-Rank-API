import { sql } from "../config/db";
import type { InsertUserActivity, UserActivity } from "../types/database.types";

export class DatabaseStorage {
  async searchTaxiRanks(query: string): Promise<any[]> {
    try {
      const searchTerm = `%${query}%`;
      return await sql`
        SELECT * FROM taxi_ranks
        WHERE (name ILIKE ${searchTerm}
          OR address ILIKE ${searchTerm}
          OR city ILIKE ${searchTerm})
          AND is_active = true
        ORDER BY name
          LIMIT 50
      `;
    } catch (error) {
      console.error("Error searching taxi ranks:", error);
      return [];
    }
  }

  async getTaxiRankById(id: string): Promise<any | null> {
    try {
      const [rank] = await sql`
        SELECT * FROM taxi_ranks
        WHERE id = ${id} AND is_active = true
      `;
      return rank || null;
    } catch (error) {
      console.error("Error getting taxi rank by ID:", error);
      return null;
    }
  }

  async getNearbyTaxiRanks(
    latitude: number,
    longitude: number,
    radius = 5000,
  ): Promise<any[]> {
    try {
      return await sql`
        SELECT *,
               (6371 * acos(cos(radians(${latitude})) * cos(radians(latitude))
                              * cos(radians(longitude) - radians(${longitude}))
                 + sin(radians(${latitude})) * sin(radians(latitude)))) AS distance
        FROM taxi_ranks
        WHERE is_active = true
        HAVING distance < ${radius / 1000}
        ORDER BY distance
          LIMIT 20
      `;
    } catch (error) {
      console.error("Error getting nearby taxi ranks:", error);
      return [];
    }
  }

  async createTaxiRank(data: any): Promise<any> {
    try {
      const [rank] = await sql`
        INSERT INTO taxi_ranks (name, latitude, longitude, address, city, province)
        VALUES (${data.name}, ${data.latitude}, ${data.longitude}, ${data.address}, ${data.city}, ${data.province})
          RETURNING *
      `;
      return rank;
    } catch (error) {
      console.error("Error creating taxi rank:", error);
      throw error;
    }
  }

  // Hiking Signs methods
  async getHikingSigns(): Promise<any[]> {
    try {
      return await sql`
        SELECT hs.*, u.first_name, u.last_name
        FROM hiking_signs hs
        LEFT JOIN users u ON hs.user_id = u.id
        ORDER BY hs.created_at DESC
      `;
    } catch (error) {
      console.error("Error getting hiking signs:", error);
      return [];
    }
  }

  async getHikingSignsByUser(userId: string): Promise<any[]> {
    try {
      return await sql`
        SELECT hs.*, u.first_name, u.last_name
        FROM hiking_signs hs
        LEFT JOIN users u ON hs.user_id = u.id
        WHERE hs.user_id = ${userId}
        ORDER BY hs.created_at DESC
      `;
    } catch (error) {
      console.error("Error getting hiking signs by user:", error);
      return [];
    }
  }

  async createHikingSign(data: any): Promise<any> {
    try {
      const [sign] = await sql`
        INSERT INTO hiking_signs (
          user_id, image_url, description, latitude, longitude, address,
          from_location, to_location, fare_amount, sign_type,
          verification_count, is_verified, created_at, updated_at
        )
        VALUES (
          ${data.userId}, ${data.imageUrl}, ${data.description || null},
          ${data.latitude}, ${data.longitude}, ${data.address || null},
          ${data.fromLocation || null}, ${data.toLocation || null},
          ${data.fareAmount || null}, ${data.signType || "fare_board"},
          0, false, NOW(), NOW()
        )
        RETURNING *
      `;
      return sign;
    } catch (error) {
      console.error("Error creating hiking sign:", error);
      throw error;
    }
  }

  // User Activity methods
  async createUserActivity(
    activity: InsertUserActivity,
  ): Promise<UserActivity> {
    try {
      const [newActivity] = await sql`
        INSERT INTO user_activities (
          user_id, activity_type, rank_id, sign_id, route_id, metadata, created_at
        )
        VALUES (
          ${activity.user_id}, ${activity.activity_type}, 
          ${activity.rank_id || null}, ${activity.sign_id || null}, 
          ${activity.route_id || null}, ${JSON.stringify(activity.metadata || {})}, 
          NOW()
        )
        RETURNING *
      `;
      return newActivity as UserActivity;
    } catch (error) {
      console.error("Error creating user activity:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
