import { sql } from "../config/db";
import type {
  CreateJourneyRequest,
  Journey,
  JourneySearchParams,
  UpdateJourneyRequest,
} from "../database/shared/models";
import { BaseService } from "./BaseService";

export class JourneyService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ JourneyService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 JourneyService shutdown");
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

  async createJourney(journeyData: CreateJourneyRequest): Promise<Journey> {
    return this.executeQuery(async () => {
      const [journey] = await sql`
        INSERT INTO journeys (
          user_id, origin_rank_id, destination_rank_id, total_fare,
          total_duration_minutes, total_distance_km, hop_count,
          route_path, waypoints, journey_type, status,
          metadata, created_at, updated_at
        )
        VALUES (
          ${journeyData.user_id}, ${journeyData.origin_rank_id},
          ${journeyData.destination_rank_id}, ${journeyData.total_fare},
          ${journeyData.total_duration_minutes || null}, ${journeyData.total_distance_km || null},
          ${journeyData.hop_count || 1}, ${JSON.stringify(journeyData.route_path || [])},
          ${JSON.stringify(journeyData.waypoints || [])}, ${journeyData.journey_type || "direct"},
          'planned', '{}', NOW(), NOW()
        )
        RETURNING *
      `;
      return journey as Journey;
    });
  }

  async getJourneyById(journeyId: string): Promise<Journey | null> {
    return this.executeQuery(async () => {
      const [journey] = await sql`
        SELECT j.*,
               or.name as origin_name, or.address as origin_address,
               dr.name as destination_name, dr.address as destination_address,
               u.first_name, u.last_name
        FROM journeys j
               LEFT JOIN taxi_ranks or ON j.origin_rank_id = or.id
          LEFT JOIN taxi_ranks dr ON j.destination_rank_id = dr.id
          LEFT JOIN users u ON j.user_id = u.id
        WHERE j.id = ${journeyId}
      `;
      return (journey as Journey) || null;
    });
  }

  async getJourneys(
    params: JourneySearchParams,
  ): Promise<{ journeys: Journey[]; total: number }> {
    return this.executeQuery(async () => {
      const {
        limit = 20,
        offset = 0,
        user_id,
        status,
        journey_type,
        date_from,
        date_to,
      } = params;

      const whereConditions = ["1=1"];
      const queryParams: any[] = [];

      if (user_id) {
        whereConditions.push(`j.user_id = $${queryParams.length + 1}`);
        queryParams.push(user_id);
      }

      if (status) {
        whereConditions.push(`j.status = $${queryParams.length + 1}`);
        queryParams.push(status);
      }

      if (journey_type) {
        whereConditions.push(`j.journey_type = $${queryParams.length + 1}`);
        queryParams.push(journey_type);
      }

      if (date_from) {
        whereConditions.push(`j.created_at >= $${queryParams.length + 1}`);
        queryParams.push(date_from);
      }

      if (date_to) {
        whereConditions.push(`j.created_at <= $${queryParams.length + 1}`);
        queryParams.push(date_to);
      }

      const whereClause = whereConditions.join(" AND ");

      const journeys = await sql`
        SELECT j.*,
               or.name as origin_name, or.address as origin_address,
               dr.name as destination_name, dr.address as destination_address,
               u.first_name, u.last_name
        FROM journeys j
               LEFT JOIN taxi_ranks or ON j.origin_rank_id = or.id
          LEFT JOIN taxi_ranks dr ON j.destination_rank_id = dr.id
          LEFT JOIN users u ON j.user_id = u.id
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY j.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM journeys j
        WHERE ${sql.unsafe(whereClause)}
      `;

      return { journeys: journeys as Journey[], total: Number.parseInt(count) };
    });
  }

  async updateJourney(
    journeyId: string,
    updateData: UpdateJourneyRequest,
  ): Promise<Journey | null> {
    return this.executeQuery(async () => {
      const updateFields = Object.keys(updateData)
        .filter(
          (key) => updateData[key as keyof UpdateJourneyRequest] !== undefined,
        )
        .map((key, index) => `${key} = $${index + 2}`)
        .join(", ");

      if (!updateFields) {
        throw new Error("No fields to update");
      }

      const values = Object.keys(updateData)
        .filter(
          (key) => updateData[key as keyof UpdateJourneyRequest] !== undefined,
        )
        .map((key) => updateData[key as keyof UpdateJourneyRequest]);

      const [journey] = await sql`
        UPDATE journeys
        SET ${sql.unsafe(updateFields)}, updated_at = NOW()
        WHERE id = ${journeyId}
          RETURNING *
      `;
      return (journey as Journey) || null;
    });
  }

  async updateJourneyStatus(
    journeyId: string,
    status: string,
  ): Promise<Journey | null> {
    return this.executeQuery(async () => {
      const [journey] = await sql`
        UPDATE journeys 
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${journeyId}
        RETURNING *
      `;
      return (journey as Journey) || null;
    });
  }

  async deleteJourney(journeyId: string): Promise<boolean> {
    return this.executeQuery(async () => {
      const [result] = await sql`
        DELETE FROM journeys
        WHERE id = ${journeyId}
          RETURNING id
      `;
      return !!result;
    });
  }

  async getJourneyStats(
    userId: string,
    params: { start_date?: Date; end_date?: Date },
  ): Promise<any> {
    return this.executeQuery(async () => {
      const { start_date, end_date } = params;

      const whereConditions = [`user_id = '${userId}'`];

      if (start_date) {
        whereConditions.push(`created_at >= '${start_date.toISOString()}'`);
      }

      if (end_date) {
        whereConditions.push(`created_at <= '${end_date.toISOString()}'`);
      }

      const whereClause = whereConditions.join(" AND ");

      const [stats] = await sql`
        SELECT 
          COUNT(*) as total_journeys,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_journeys,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_journeys,
          AVG(total_fare) as average_fare,
          SUM(total_fare) as total_spent,
          AVG(total_duration_minutes) as average_duration,
          SUM(total_distance_km) as total_distance
        FROM journeys
        WHERE ${sql.unsafe(whereClause)}
      `;

      return (
        stats || {
          total_journeys: 0,
          completed_journeys: 0,
          cancelled_journeys: 0,
          average_fare: 0,
          total_spent: 0,
          average_duration: 0,
          total_distance: 0,
        }
      );
    });
  }
}
