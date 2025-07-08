// src/services/analytics/AnalyticsService.ts
import { BaseService } from "../core/base/BaseService";
import { sql } from "../../config/db";

interface AnalyticsEvent {
  userId: string;
  eventType: string;
  metadata?: Record<string, any>;
}

export class AnalyticsService extends BaseService {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    await this.executeTransaction(async () => {
      await sql`
        INSERT INTO analytics_events (
          user_id, event_type, metadata, created_at
        ) VALUES (
          ${event.userId},
          ${event.eventType},
          ${event.metadata || {}},
          CURRENT_TIMESTAMP
        )
      `;
    });
  }

  async getUserMetrics(userId: string): Promise<any> {
    return await this.executeTransaction(async () => {
      const [metrics] = await sql`
        SELECT 
          COUNT(DISTINCT CASE WHEN event_type = 'sign_upload' THEN id END) as total_signs,
          COUNT(DISTINCT CASE WHEN event_type = 'rank_view' THEN id END) as rank_views,
          COUNT(DISTINCT CASE WHEN event_type = 'route_search' THEN id END) as route_searches
        FROM analytics_events
        WHERE user_id = ${userId}
      `;
      return metrics;
    });
  }

  async getPopularRanks(limit: number = 10): Promise<any[]> {
    return await this.executeTransaction(async () => {
      return await sql`
        SELECT 
          tr.id,
          tr.name,
          tr.city,
          COUNT(ae.id) as view_count
        FROM taxi_ranks tr
        LEFT JOIN analytics_events ae ON 
          ae.event_type = 'rank_view' 
          AND ae.metadata->>'rank_id' = tr.id::text
        GROUP BY tr.id
        ORDER BY view_count DESC
        LIMIT ${limit}
      `;
    });
  }
}