import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";

export interface Device {
  id: string;
  userId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'web';
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web';
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion: string;
  pushToken?: string;
  isActive: boolean;
  lastSeen: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Date;
  };
  settings: {
    pushNotifications: boolean;
    locationTracking: boolean;
    backgroundSync: boolean;
    dataUsage: 'low' | 'medium' | 'high';
  };
  metadata: {
    userAgent?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceStats {
  totalDevices: number;
  activeDevices: number;
  devicesByType: Record<string, number>;
  devicesByPlatform: Record<string, number>;
  devicesWithPushTokens: number;
  recentlyActive: number; // Last 24 hours
}

export interface PushNotification {
  id: string;
  deviceIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  category?: string;
  priority: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  results?: Array<{
    deviceId: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
  createdAt: Date;
}

export class DeviceService extends BaseService {
  private initialized = false;
  private devices: Map<string, Device> = new Map();
  private devicesByUser: Map<string, Set<string>> = new Map();
  private pushNotifications: Map<string, PushNotification> = new Map();

  constructor() {
    super('DeviceService');
  }

  async init(): Promise<void> {
    console.log('Initializing DeviceService');
    
    try {
      // Load existing devices (in a real implementation, this would be from database)
      await this.loadDevices();
      
      this.initialized = true;
      console.log('DeviceService initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async loadDevices(): Promise<void> {
    // Mock data - in real implementation, load from database
    const mockDevices: Device[] = [
      {
        id: 'device_1',
        userId: 'user_1',
        deviceType: 'mobile',
        platform: 'ios',
        deviceName: 'iPhone 14',
        deviceModel: 'iPhone14,2',
        osVersion: '17.0',
        appVersion: '1.0.0',
        pushToken: 'push_token_1',
        isActive: true,
        lastSeen: new Date(),
        settings: {
          pushNotifications: true,
          locationTracking: true,
          backgroundSync: true,
          dataUsage: 'medium',
        },
        metadata: {
          timezone: 'Africa/Johannesburg',
          language: 'en',
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'device_2',
        userId: 'user_2',
        deviceType: 'mobile',
        platform: 'android',
        deviceName: 'Samsung Galaxy S23',
        deviceModel: 'SM-S911B',
        osVersion: '14',
        appVersion: '1.0.0',
        pushToken: 'push_token_2',
        isActive: true,
        lastSeen: new Date(),
        settings: {
          pushNotifications: true,
          locationTracking: false,
          backgroundSync: true,
          dataUsage: 'high',
        },
        metadata: {
          timezone: 'Africa/Johannesburg',
          language: 'en',
        },
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date(),
      },
    ];

    for (const device of mockDevices) {
      this.devices.set(device.id, device);
      this.indexDevice(device);
    }

    console.log(`Loaded ${mockDevices.length} devices`);
  }

  private indexDevice(device: Device): void {
    if (!this.devicesByUser.has(device.userId)) {
      this.devicesByUser.set(device.userId, new Set());
    }
    this.devicesByUser.get(device.userId)!.add(device.id);
  }

  private unindexDevice(device: Device): void {
    const userDevices = this.devicesByUser.get(device.userId);
    if (userDevices) {
      userDevices.delete(device.id);
      if (userDevices.size === 0) {
        this.devicesByUser.delete(device.userId);
      }
    }
  }

  async registerDevice(deviceData: Omit<Device, 'id' | 'createdAt' | 'updatedAt' | 'lastSeen'>): Promise<Device> {
    try {
      // Check if device already exists for this user
      const existingDevice = await this.findDeviceByUserAndIdentifier(
        deviceData.userId,
        deviceData.deviceName,
        deviceData.platform
      );

      if (existingDevice) {
        // Update existing device
        const updatedDevice = await this.updateDevice(existingDevice.id, {
          ...deviceData,
          lastSeen: new Date(),
        });
        if (updatedDevice) {
          return updatedDevice;
        }
      }

      // Create new device
      const device: Device = {
        ...deviceData,
        id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.devices.set(device.id, device);
      this.indexDevice(device);

      console.log('Device registered successfully', { deviceId: device.id, userId: device.userId });
      return device;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getDevice(deviceId: string): Promise<Device | null> {
    try {
      return this.devices.get(deviceId) || null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async updateDevice(deviceId: string, updates: Partial<Device>): Promise<Device | null> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        return null;
      }

      const updatedDevice: Device = {
        ...device,
        ...updates,
        updatedAt: new Date(),
      };

      this.devices.set(deviceId, updatedDevice);

      console.log('Device updated successfully', { deviceId });
      return updatedDevice;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async updateDeviceLocation(deviceId: string, location: Device['location']): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId);
      if (!device || !device.settings.locationTracking) {
        return false;
      }

      device.location = location;
      device.lastSeen = new Date();
      device.updatedAt = new Date();

      console.log('Device location updated', { deviceId });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async updateDeviceSettings(deviceId: string, settings: Partial<Device['settings']>): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        return false;
      }

      device.settings = {
        ...device.settings,
        ...settings,
      };
      device.updatedAt = new Date();

      console.log('Device settings updated', { deviceId, settings });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async updatePushToken(deviceId: string, pushToken: string): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        return false;
      }

      device.pushToken = pushToken;
      device.updatedAt = new Date();

      console.log('Push token updated', { deviceId });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async deactivateDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        return false;
      }

      device.isActive = false;
      device.updatedAt = new Date();

      console.log('Device deactivated', { deviceId });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        return false;
      }

      this.unindexDevice(device);
      this.devices.delete(deviceId);

      console.log('Device deleted', { deviceId });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async getUserDevices(userId: string): Promise<Device[]> {
    try {
      const deviceIds = this.devicesByUser.get(userId);
      if (!deviceIds) {
        return [];
      }

      const devices: Device[] = [];
      for (const deviceId of deviceIds) {
        const device = this.devices.get(deviceId);
        if (device) {
          devices.push(device);
        }
      }

      return devices.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async getActiveDevices(userId?: string): Promise<Device[]> {
    try {
      let devices: Device[];
      
      if (userId) {
        devices = await this.getUserDevices(userId);
      } else {
        devices = Array.from(this.devices.values());
      }

      return devices.filter(d => d.isActive);
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  private async findDeviceByUserAndIdentifier(userId: string, deviceName: string, platform: string): Promise<Device | null> {
    try {
      const userDevices = await this.getUserDevices(userId);
      return userDevices.find(d => d.deviceName === deviceName && d.platform === platform) || null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async sendPushNotification(notification: Omit<PushNotification, 'id' | 'createdAt' | 'status' | 'results'>): Promise<PushNotification> {
    try {
      const pushNotification: PushNotification = {
        ...notification,
        id: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        createdAt: new Date(),
      };

      this.pushNotifications.set(pushNotification.id, pushNotification);

      // Simulate sending push notifications
      setTimeout(async () => {
        await this.processPushNotification(pushNotification.id);
      }, 1000);

      console.log('Push notification queued', { 
        notificationId: pushNotification.id, 
        deviceCount: notification.deviceIds.length 
      });
      
      return pushNotification;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async processPushNotification(notificationId: string): Promise<void> {
    try {
      const notification = this.pushNotifications.get(notificationId);
      if (!notification) {
        return;
      }

      const results: PushNotification['results'] = [];

      // Process each device
      for (const deviceId of notification.deviceIds) {
        const device = this.devices.get(deviceId);
        
        if (!device) {
          results.push({
            deviceId,
            status: 'failed',
            error: 'Device not found',
          });
          continue;
        }

        if (!device.isActive) {
          results.push({
            deviceId,
            status: 'failed',
            error: 'Device is inactive',
          });
          continue;
        }

        if (!device.settings.pushNotifications) {
          results.push({
            deviceId,
            status: 'failed',
            error: 'Push notifications disabled',
          });
          continue;
        }

        if (!device.pushToken) {
          results.push({
            deviceId,
            status: 'failed',
            error: 'No push token',
          });
          continue;
        }

        // Simulate sending to push service (FCM, APNS, etc.)
        const success = Math.random() > 0.1; // 90% success rate
        
        results.push({
          deviceId,
          status: success ? 'success' : 'failed',
          error: success ? undefined : 'Push service error',
        });
      }

      // Update notification
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.results = results;

      const successCount = results.filter(r => r.status === 'success').length;
      console.log('Push notification processed', { 
        notificationId, 
        total: results.length, 
        success: successCount,
        failed: results.length - successCount,
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async sendPushToUser(userId: string, title: string, body: string, data?: Record<string, any>): Promise<PushNotification | null> {
    try {
      const devices = await this.getActiveDevices(userId);
      const deviceIds = devices
        .filter(d => d.settings.pushNotifications && d.pushToken)
        .map(d => d.id);

      if (deviceIds.length === 0) {
        console.log('No devices available for push notification', { userId });
        return null;
      }

      return await this.sendPushNotification({
        deviceIds,
        title,
        body,
        data,
        priority: 'normal',
      });
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async getPushNotification(notificationId: string): Promise<PushNotification | null> {
    try {
      return this.pushNotifications.get(notificationId) || null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async getDeviceStats(): Promise<DeviceStats> {
    try {
      const devices = Array.from(this.devices.values());
      const activeDevices = devices.filter(d => d.isActive);
      
      // Count by type
      const devicesByType: Record<string, number> = {};
      devices.forEach(d => {
        devicesByType[d.deviceType] = (devicesByType[d.deviceType] || 0) + 1;
      });

      // Count by platform
      const devicesByPlatform: Record<string, number> = {};
      devices.forEach(d => {
        devicesByPlatform[d.platform] = (devicesByPlatform[d.platform] || 0) + 1;
      });

      // Count devices with push tokens
      const devicesWithPushTokens = devices.filter(d => d.pushToken).length;

      // Count recently active devices (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const recentlyActive = devices.filter(d => d.lastSeen >= oneDayAgo).length;

      return {
        totalDevices: devices.length,
        activeDevices: activeDevices.length,
        devicesByType,
        devicesByPlatform,
        devicesWithPushTokens,
        recentlyActive,
      };
    } catch (error) {
      this.handleError(error as Error);
      return {
        totalDevices: 0,
        activeDevices: 0,
        devicesByType: {},
        devicesByPlatform: {},
        devicesWithPushTokens: 0,
        recentlyActive: 0,
      };
    }
  }

  async cleanupInactiveDevices(daysInactive: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const inactiveDevices = Array.from(this.devices.values())
        .filter(d => d.lastSeen < cutoffDate);

      let deletedCount = 0;
      for (const device of inactiveDevices) {
        const success = await this.deleteDevice(device.id);
        if (success) {
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} inactive devices`);
      return deletedCount;
    } catch (error) {
      this.handleError(error as Error);
      return 0;
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const stats = await this.getDeviceStats();
    
    return {
      status: 'healthy',
      details: {
        service: 'DeviceService',
        initialized: this.initialized,
        stats,
        pushNotifications: this.pushNotifications.size,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down DeviceService');
    
    this.devices.clear();
    this.devicesByUser.clear();
    this.pushNotifications.clear();
    this.initialized = false;
  }
}