import { sql } from "../config/db";
import { BaseService } from "./BaseService";

interface RegisterDeviceData {
  user_id: string;
  device_token: string;
  device_type: "ios" | "android" | "web";
  device_model?: string;
  os_version?: string;
  app_version?: string;
  is_active?: boolean;
}

interface DeviceSearchParams {
  user_id?: string;
  device_type?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

interface UserDevice {
  id: string;
  user_id: string;
  device_token: string;
  device_type: string;
  device_model?: string;
  os_version?: string;
  app_version?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_seen: Date;
}

export class DeviceService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ DeviceService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 DeviceService shutdown");
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

  async registerDevice(deviceData: RegisterDeviceData): Promise<UserDevice> {
    return this.executeQuery(async () => {
      const deviceId = this.generateDeviceId();

      // Check if device already exists and update it
      const [existingDevice] = await sql`
        SELECT * FROM user_devices 
        WHERE device_token = ${deviceData.device_token}
      `;

      if (existingDevice) {
        const [updatedDevice] = await sql`
          UPDATE user_devices
          SET user_id = ${deviceData.user_id},
              device_type = ${deviceData.device_type},
              device_model = ${deviceData.device_model || null},
              os_version = ${deviceData.os_version || null},
              app_version = ${deviceData.app_version || null},
              is_active = ${deviceData.is_active ?? true},
              updated_at = NOW(),
              last_seen = NOW()
          WHERE device_token = ${deviceData.device_token}
          RETURNING *
        `;

        return updatedDevice as UserDevice;
      }

      // Create new device
      const [device] = await sql`
        INSERT INTO user_devices (
          id, user_id, device_token, device_type, device_model,
          os_version, app_version, is_active, created_at, updated_at, last_seen
        )
        VALUES (
          ${deviceId}, ${deviceData.user_id}, ${deviceData.device_token},
          ${deviceData.device_type}, ${deviceData.device_model || null},
          ${deviceData.os_version || null}, ${deviceData.app_version || null},
          ${deviceData.is_active ?? true}, NOW(), NOW(), NOW()
        )
        RETURNING *
      `;

      return device as UserDevice;
    });
  }

  async getUserDevices(
    userId: string,
    params: DeviceSearchParams = {},
  ): Promise<UserDevice[]> {
    return this.executeQuery(async () => {
      const { device_type, is_active, limit = 50, offset = 0 } = params;

      const whereConditions = [`user_id = '${userId}'`];

      if (device_type) {
        whereConditions.push(`device_type = '${device_type}'`);
      }

      if (is_active !== undefined) {
        whereConditions.push(`is_active = ${is_active}`);
      }

      const whereClause = whereConditions.join(" AND ");

      const devices = await sql`
        SELECT *
        FROM user_devices
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY last_seen DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return devices as UserDevice[];
    });
  }

  async getDeviceById(id: string): Promise<UserDevice | null> {
    return this.executeQuery(async () => {
      const [device] = await sql`
        SELECT * FROM user_devices WHERE id = ${id}
      `;

      return (device as UserDevice) || null;
    });
  }

  async updateDevice(
    id: string,
    updateData: Partial<RegisterDeviceData>,
  ): Promise<UserDevice | null> {
    return this.executeQuery(async () => {
      const updateFields = Object.keys(updateData)
        .filter(
          (key) => updateData[key as keyof RegisterDeviceData] !== undefined,
        )
        .map(
          (key) => `${key} = '${updateData[key as keyof RegisterDeviceData]}'`,
        )
        .join(", ");

      if (!updateFields) {
        throw new Error("No fields to update");
      }

      const [device] = await sql`
        UPDATE user_devices
        SET ${sql.unsafe(updateFields)}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return (device as UserDevice) || null;
    });
  }

  async deactivateDevice(
    id: string,
    userId: string,
  ): Promise<UserDevice | null> {
    return this.executeQuery(async () => {
      const [device] = await sql`
        UPDATE user_devices
        SET is_active = false, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      return (device as UserDevice) || null;
    });
  }

  async deleteDevice(id: string, userId: string): Promise<boolean> {
    return this.executeQuery(async () => {
      const [result] = await sql`
        DELETE FROM user_devices
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id
      `;

      return !!result;
    });
  }

  async updateDeviceToken(
    id: string,
    deviceToken: string,
  ): Promise<UserDevice | null> {
    return this.executeQuery(async () => {
      const [device] = await sql`
        UPDATE user_devices
        SET device_token = ${deviceToken}, updated_at = NOW(), last_seen = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return (device as UserDevice) || null;
    });
  }

  async updateLastSeen(id: string): Promise<UserDevice | null> {
    return this.executeQuery(async () => {
      const [device] = await sql`
        UPDATE user_devices
        SET last_seen = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return (device as UserDevice) || null;
    });
  }

  async getDeviceStats(
    params: { user_id?: string; start_date?: Date; end_date?: Date } = {},
  ): Promise<any> {
    return this.executeQuery(async () => {
      const { user_id, start_date, end_date } = params;

      const whereConditions = ["1=1"];

      if (user_id) {
        whereConditions.push(`user_id = '${user_id}'`);
      }

      if (start_date) {
        whereConditions.push(`created_at >= '${start_date.toISOString()}'`);
      }

      if (end_date) {
        whereConditions.push(`created_at <= '${end_date.toISOString()}'`);
      }

      const whereClause = whereConditions.join(" AND ");

      const stats = await sql`
        SELECT 
          COUNT(*) as total_devices,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_devices,
          COUNT(CASE WHEN device_type = 'ios' THEN 1 END) as ios_devices,
          COUNT(CASE WHEN device_type = 'android' THEN 1 END) as android_devices,
          COUNT(CASE WHEN device_type = 'web' THEN 1 END) as web_devices,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as new_today,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week
        FROM user_devices
        WHERE ${sql.unsafe(whereClause)}
      `;

      return stats[0];
    });
  }

  async cleanupInactiveDevices(daysInactive = 90): Promise<number> {
    return this.executeQuery(async () => {
      const result = await sql`
        DELETE FROM user_devices
        WHERE last_seen < NOW() - INTERVAL '${daysInactive} days'
          AND is_active = false
        RETURNING id
      `;

      return result.length;
    });
  }

  async getActiveDevicesForUser(userId: string): Promise<UserDevice[]> {
    return this.executeQuery(async () => {
      const devices = await sql`
        SELECT *
        FROM user_devices
        WHERE user_id = ${userId} 
          AND is_active = true
          AND last_seen >= NOW() - INTERVAL '30 days'
        ORDER BY last_seen DESC
      `;

      return devices as UserDevice[];
    });
  }

  private generateDeviceId(): string {
    return (
      "device_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  async updateDeviceMetadata(
    id: string,
    metadata: Record<string, any>,
  ): Promise<UserDevice | null> {
    return this.executeQuery(async () => {
      const [device] = await sql`
        UPDATE user_devices
        SET metadata = ${JSON.stringify(metadata)}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return (device as UserDevice) || null;
    });
  }

  async getDevicesByType(
    deviceType: string,
    limit = 100,
  ): Promise<UserDevice[]> {
    return this.executeQuery(async () => {
      const devices = await sql`
        SELECT *
        FROM user_devices
        WHERE device_type = ${deviceType} AND is_active = true
        ORDER BY last_seen DESC
        LIMIT ${limit}
      `;

      return devices as UserDevice[];
    });
  }
}
