import { sql } from "../config/db";
import { BaseService } from "./BaseService";

interface AnalyticsSearchParams {
  start_date?: Date;
  end_date?: Date;
  metric_type?: string;
  user_id?: string;
}

interface TrackEventData {
  event_type: string;
  user_id: string;
  metadata?: Record<string, any>;
  session_id?: string;
  timestamp: Date;
}

interface UserAnalyticsParams {
  start_date?: Date;
  end_date?: Date;
}

interface PopularRoutesParams {
  limit: number;
  period: string;
}

export class AnalyticsService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ AnalyticsService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 AnalyticsService shutdown");
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

  async getAnalytics(params: AnalyticsSearchParams): Promise<any> {
    return this.executeQuery(async () => {
      const { start_date, end_date, metric_type, user_id } = params;

      const whereConditions = ["1=1"];

      if (start_date) {
        whereConditions.push(`created_at >= '${start_date.toISOString()}'`);
      }

      if (end_date) {
        whereConditions.push(`created_at <= '${end_date.toISOString()}'`);
      }

      if (metric_type) {
        whereConditions.push(`event_type = '${metric_type}'`);
      }

      if (user_id) {
        whereConditions.push(`user_id = '${user_id}'`);
      }

      const whereClause = whereConditions.join(" AND ");

      const analytics = await sql`
        SELECT 
          event_type,
          COUNT(*) as count,
          DATE_TRUNC('day', created_at) as date
        FROM analytics_events
        WHERE ${sql.unsafe(whereClause)}
        GROUP BY event_type, DATE_TRUNC('day', created_at)
        ORDER BY date DESC, count DESC
      `;

      const summary = await sql`
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM analytics_events
        WHERE ${sql.unsafe(whereClause)}
      `;

      return {
        summary: summary[0],
        events: analytics,
      };
    });
  }

  async trackEvent(eventData: TrackEventData): Promise<void> {
    return this.executeQuery(async () => {
      // Check if user_id is the zero UUID or 'anonymous', and if so, set it to NULL
      const userId = eventData.user_id === '00000000-0000-0000-0000-000000000000' || eventData.user_id === 'anonymous' ? null : eventData.user_id;

      await sql`
        INSERT INTO analytics_events (
          event_type, user_id, metadata, session_id, created_at
        )
        VALUES (
          ${eventData.event_type},
          ${userId},
          ${JSON.stringify(eventData.metadata || {})},
          ${eventData.session_id || null},
          ${eventData.timestamp.toISOString()}
        )
      `;
    });
  }

  async getUserAnalytics(
    userId: string,
    params: UserAnalyticsParams,
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

      const userStats = await sql`
        SELECT 
          event_type,
          COUNT(*) as count,
          DATE_TRUNC('day', created_at) as date
        FROM analytics_events
        WHERE ${sql.unsafe(whereClause)}
        GROUP BY event_type, DATE_TRUNC('day', created_at)
        ORDER BY date DESC, count DESC
      `;

      const journeyStats = await sql`
        SELECT 
          COUNT(*) as total_journeys,
          AVG(total_fare) as avg_fare,
          SUM(total_distance_km) as total_distance
        FROM journeys
        WHERE user_id = ${userId}
          ${start_date ? sql`AND created_at >= ${start_date.toISOString()}` : sql``}
          ${end_date ? sql`AND created_at <= ${end_date.toISOString()}` : sql``}
      `;

      return {
        events: userStats,
        journey_stats: journeyStats[0] || {},
      };
    });
  }

  async getPopularRoutes(params: PopularRoutesParams): Promise<any[]> {
    return this.executeQuery(async () => {
      const { limit, period } = params;

      let timeCondition = "";
      switch (period) {
        case "1d":
          timeCondition = "created_at >= NOW() - INTERVAL '1 day'";
          break;
        case "7d":
          timeCondition = "created_at >= NOW() - INTERVAL '7 days'";
          break;
        case "30d":
          timeCondition = "created_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          timeCondition = "created_at >= NOW() - INTERVAL '7 days'";
      }

      const popularRoutes = await sql`
        SELECT 
          tr.id,
          tr.from_location,
          tr.to_location,
          tr.route_type,
          tr.fare,
          COUNT(j.id) as usage_count,
          AVG(j.total_fare) as avg_fare,
          or_rank.name as origin_name,
          dest_rank.name as destination_name
        FROM transit_routes tr
        LEFT JOIN journeys j ON (
          j.route_path @> ARRAY[tr.id] 
          AND ${sql.unsafe(timeCondition)}
        )
        LEFT JOIN taxi_ranks or_rank ON tr.origin_rank_id = or_rank.id
        LEFT JOIN taxi_ranks dest_rank ON tr.destination_rank_id = dest_rank.id
        GROUP BY tr.id, tr.from_location, tr.to_location, tr.route_type, 
                 tr.fare, or_rank.name, dest_rank.name
        HAVING COUNT(j.id) > 0
        ORDER BY usage_count DESC
        LIMIT ${limit}
      `;

      return popularRoutes;
    });
  }

  async getMetricsSummary(period = "7d"): Promise<any> {
    return this.executeQuery(async () => {
      let timeCondition = "";
      switch (period) {
        case "1d":
          timeCondition = "created_at >= NOW() - INTERVAL '1 day'";
          break;
        case "7d":
          timeCondition = "created_at >= NOW() - INTERVAL '7 days'";
          break;
        case "30d":
          timeCondition = "created_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          timeCondition = "created_at >= NOW() - INTERVAL '7 days'";
      }

      const metrics = await sql`
        SELECT 
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as total_events,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM analytics_events
        WHERE ${sql.unsafe(timeCondition)}
      `;

      const journeyMetrics = await sql`
        SELECT 
          COUNT(*) as total_journeys,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_journeys,
          AVG(total_fare) as avg_fare
        FROM journeys
        WHERE ${sql.unsafe(timeCondition)}
      `;

      return {
        ...metrics[0],
        ...journeyMetrics[0],
      };
    });
  }

  async trackUserSession(
    userId: string,
    sessionId: string,
    action: string,
    metadata?: any,
  ): Promise<void> {
    return this.executeQuery(async () => {
      await sql`
        INSERT INTO user_sessions (
          user_id, session_id, action, metadata, created_at
        )
        VALUES (
          ${userId}, ${sessionId}, ${action}, 
          ${JSON.stringify(metadata || {})}, NOW()
        )
      `;
    });
  }
}
