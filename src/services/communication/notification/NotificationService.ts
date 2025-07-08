import { sql } from "../../../config/db";
import { BaseService } from "../../core/base/BaseService";

interface CreateNotificationData {
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  category?: string;
  action_url?: string;
  metadata?: Record<string, any>;
  scheduled_for?: string;
}

interface NotificationSearchParams {
  user_id: string;
  is_read?: boolean;
  type?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  action_url?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
  scheduled_for?: Date;
}

interface PushNotificationData {
  user_ids: string[];
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ NotificationService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 NotificationService shutdown");
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

  async createNotification(
    data: CreateNotificationData,
  ): Promise<Notification> {
    return this.executeQuery(async () => {
      const notificationId = this.generateNotificationId();
      const scheduledFor = data.scheduled_for
        ? new Date(data.scheduled_for)
        : null;

      const [notification] = await sql`
        INSERT INTO notifications (
          id, user_id, title, message, type, category, 
          action_url, metadata, is_read, scheduled_for, created_at
        )
        VALUES (
          ${notificationId}, ${data.user_id}, ${data.title}, ${data.message},
          ${data.type}, ${data.category || null}, ${data.action_url || null},
          ${JSON.stringify(data.metadata || {})}, false, 
          ${scheduledFor?.toISOString() || null}, NOW()
        )
        RETURNING *
      `;

      return notification as Notification;
    });
  }

  async getNotifications(
    params: NotificationSearchParams,
  ): Promise<{ notifications: Notification[]; total: number }> {
    return this.executeQuery(async () => {
      const {
        user_id,
        is_read,
        type,
        category,
        limit = 20,
        offset = 0,
      } = params;

      const whereConditions = [`user_id = '${user_id}'`];

      if (is_read !== undefined) {
        whereConditions.push(`is_read = ${is_read}`);
      }

      if (type) {
        whereConditions.push(`type = '${type}'`);
      }

      if (category) {
        whereConditions.push(`category = '${category}'`);
      }

      const whereClause = whereConditions.join(" AND ");

      const notifications = await sql`
        SELECT *
        FROM notifications
        WHERE ${sql.unsafe(whereClause)}
          AND (scheduled_for IS NULL OR scheduled_for <= NOW())
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM notifications
        WHERE ${sql.unsafe(whereClause)}
          AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      `;

      return {
        notifications: notifications as Notification[],
        total: Number.parseInt(count),
      };
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    return this.executeQuery(async () => {
      const [notification] = await sql`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE id = ${id} AND user_id = ${userId} AND is_read = false
        RETURNING *
      `;

      return (notification as Notification) || null;
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.executeQuery(async () => {
      const result = await sql`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = ${userId} AND is_read = false
        RETURNING id
      `;

      return result.length;
    });
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    return this.executeQuery(async () => {
      const [result] = await sql`
        DELETE FROM notifications
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id
      `;

      return !!result;
    });
  }

  async getNotificationCounts(userId: string): Promise<any> {
    return this.executeQuery(async () => {
      const counts = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
          COUNT(CASE WHEN is_read = true THEN 1 END) as read,
          COUNT(CASE WHEN type = 'info' AND is_read = false THEN 1 END) as unread_info,
          COUNT(CASE WHEN type = 'warning' AND is_read = false THEN 1 END) as unread_warning,
          COUNT(CASE WHEN type = 'error' AND is_read = false THEN 1 END) as unread_error,
          COUNT(CASE WHEN type = 'success' AND is_read = false THEN 1 END) as unread_success
        FROM notifications
        WHERE user_id = ${userId}
          AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      `;

      return counts[0];
    });
  }

  async sendPushNotification(data: PushNotificationData): Promise<any> {
    return this.executeQuery(async () => {
      // Get device tokens for users
      const devices = await sql`
        SELECT user_id, device_token, device_type
        FROM user_devices
        WHERE user_id = ANY(${data.user_ids}) AND is_active = true
      `;

      const results = [];

      for (const device of devices) {
        try {
          // Here you would integrate with your push notification service
          // For now, we'll just log the notification and create a record

          await sql`
            INSERT INTO push_notifications (
              user_id, device_token, title, message, data, 
              status, created_at
            )
            VALUES (
              ${device.user_id}, ${device.device_token}, ${data.title},
              ${data.message}, ${JSON.stringify(data.data || {})},
              'sent', NOW()
            )
          `;

          results.push({
            user_id: device.user_id,
            device_type: device.device_type,
            status: "sent",
          });
        } catch (error: any) {
          results.push({
            user_id: device.user_id,
            device_type: device.device_type,
            status: "failed",
            error: error.message,
          });
        }
      }

      return {
        total_sent: results.filter((r) => r.status === "sent").length,
        total_failed: results.filter((r) => r.status === "failed").length,
        details: results,
      };
    });
  }

  async getNotificationHistory(
    userId: string,
    days = 30,
  ): Promise<Notification[]> {
    return this.executeQuery(async () => {
      const notifications = await sql`
        SELECT *
        FROM notifications
        WHERE user_id = ${userId}
          AND created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
        LIMIT 100
      `;

      return notifications as Notification[];
    });
  }

  async createBulkNotifications(
    notifications: CreateNotificationData[],
  ): Promise<Notification[]> {
    return this.executeQuery(async () => {
      const createdNotifications = [];

      for (const notificationData of notifications) {
        const notification = await this.createNotification(notificationData);
        createdNotifications.push(notification);
      }

      return createdNotifications;
    });
  }

  private generateNotificationId(): string {
    return (
      "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  async scheduleNotification(
    data: CreateNotificationData,
    scheduleDate: Date,
  ): Promise<Notification> {
    return this.executeQuery(async () => {
      const notificationData = {
        ...data,
        scheduled_for: scheduleDate.toISOString(),
      };

      return this.createNotification(notificationData);
    });
  }

  async processScheduledNotifications(): Promise<void> {
    return this.executeQuery(async () => {
      const scheduledNotifications = await sql`
        SELECT *
        FROM notifications
        WHERE scheduled_for <= NOW()
          AND is_read = false
          AND created_at < scheduled_for
      `;

      for (const notification of scheduledNotifications) {
        // Process the notification (send push, email, etc.)
        console.log(`Processing scheduled notification: ${notification.id}`);
      }
    });
  }
}