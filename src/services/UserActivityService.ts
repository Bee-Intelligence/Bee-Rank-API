import { sql } from "../config/db";
import type {
  CreateUserActivityRequest,
  UserActivity,
  UserActivitySearchParams,
} from "../types/database.types";
import { BaseService } from "./BaseService";

export class UserActivityService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ UserActivityService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 UserActivityService shutdown");
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

  async createUserActivity(
    activityData: CreateUserActivityRequest,
  ): Promise<UserActivity> {
    return this.executeQuery(async () => {
      const activityId = this.generateActivityId();

      const [activity] = await sql`
        INSERT INTO user_activities (
          id, user_id, activity_type, description, metadata,
          ip_address, user_agent, created_at
        )
        VALUES (
          ${activityId}, ${activityData.user_id}, ${activityData.activity_type},
          ${activityData.description || null}, ${JSON.stringify(activityData.metadata || {})},
          ${activityData.ip_address || null}, ${activityData.user_agent || null}, NOW()
        )
        RETURNING *
      `;

      return activity as UserActivity;
    });
  }

  async getUserActivities(
    params: UserActivitySearchParams,
  ): Promise<{ activities: UserActivity[]; total: number }> {
    return this.executeQuery(async () => {
      const {
        user_id,
        activity_type,
        start_date,
        end_date,
        limit = 50,
        offset = 0,
      } = params;

      const whereConditions = ["1=1"];

      if (user_id) {
        whereConditions.push(`user_id = '${user_id}'`);
      }

      if (activity_type) {
        whereConditions.push(`activity_type = '${activity_type}'`);
      }

      if (start_date) {
        whereConditions.push(`created_at >= '${start_date.toISOString()}'`);
      }

      if (end_date) {
        whereConditions.push(`created_at <= '${end_date.toISOString()}'`);
      }

      const whereClause = whereConditions.join(" AND ");

      const activities = await sql`
        SELECT *
        FROM user_activities
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM user_activities
        WHERE ${sql.unsafe(whereClause)}
      `;

      return {
        activities: activities as UserActivity[],
        total: Number.parseInt(count),
      };
    });
  }

  async getUserActivityById(id: string): Promise<UserActivity | null> {
    return this.executeQuery(async () => {
      const [activity] = await sql`
        SELECT * FROM user_activities WHERE id = ${id}
      `;

      return (activity as UserActivity) || null;
    });
  }

  async deleteUserActivity(id: string, userId?: string): Promise<boolean> {
    return this.executeQuery(async () => {
      let whereClause = `id = '${id}'`;

      if (userId) {
        whereClause += ` AND user_id = '${userId}'`;
      }

      const [result] = await sql`
        DELETE FROM user_activities
        WHERE ${sql.unsafe(whereClause)}
        RETURNING id
      `;

      return !!result;
    });
  }

  async getUserActivityStats(userId: string, days = 30): Promise<any> {
    return this.executeQuery(async () => {
      const stats = await sql`
        SELECT 
          activity_type,
          COUNT(*) as count,
          DATE_TRUNC('day', created_at) as date
        FROM user_activities
        WHERE user_id = ${userId}
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY activity_type, DATE_TRUNC('day', created_at)
        ORDER BY date DESC, count DESC
      `;

      const summary = await sql`
        SELECT 
          COUNT(*) as total_activities,
          COUNT(DISTINCT activity_type) as unique_activity_types,
          COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_days
        FROM user_activities
        WHERE user_id = ${userId}
          AND created_at >= NOW() - INTERVAL '${days} days'
      `;

      return {
        summary: summary[0],
        activities_by_type: stats,
      };
    });
  }

  async getRecentActivities(
    userId: string,
    limit = 20,
  ): Promise<UserActivity[]> {
    return this.executeQuery(async () => {
      const activities = await sql`
        SELECT *
        FROM user_activities
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return activities as UserActivity[];
    });
  }

  async trackUserAction(
    userId: string,
    action: string,
    details?: any,
    request?: any,
  ): Promise<UserActivity> {
    return this.executeQuery(async () => {
      const activityData: CreateUserActivityRequest = {
        user_id: userId,
        activity_type: action,
        description: `User performed action: ${action}`,
        metadata: details || {},
        ip_address: request?.ip || request?.connection?.remoteAddress,
        user_agent: request?.get?.("User-Agent"),
      };

      return this.createUserActivity(activityData);
    });
  }

  async getActivityTypeStats(days = 30): Promise<any[]> {
    return this.executeQuery(async () => {
      const stats = await sql`
        SELECT 
          activity_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM user_activities
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY activity_type
        ORDER BY count DESC
      `;

      return stats;
    });
  }

  async cleanupOldActivities(daysToKeep = 90): Promise<number> {
    return this.executeQuery(async () => {
      const result = await sql`
        DELETE FROM user_activities
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
        RETURNING id
      `;

      return result.length;
    });
  }

  private generateActivityId(): string {
    return (
      "activity_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }
}
