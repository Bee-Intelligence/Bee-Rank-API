import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'LOGIN' | 'LOGOUT' | 'JOURNEY_CREATED' | 'JOURNEY_COMPLETED' | 'SIGN_UPLOADED' | 'PROFILE_UPDATED' | 'SEARCH' | 'VIEW_RANK' | 'OTHER';
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  device_info?: {
    platform?: string;
    version?: string;
    device_id?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  session_id?: string;
  timestamp: Date;
  created_at: Date;
}

export interface CreateActivityData {
  user_id: string;
  activity_type: 'LOGIN' | 'LOGOUT' | 'JOURNEY_CREATED' | 'JOURNEY_COMPLETED' | 'SIGN_UPLOADED' | 'PROFILE_UPDATED' | 'SEARCH' | 'VIEW_RANK' | 'OTHER';
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  device_info?: {
    platform?: string;
    version?: string;
    device_id?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  session_id?: string;
  timestamp?: Date;
}

export interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byType: Record<string, number>;
  topActivities: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export class UserActivityService extends BaseService {
  private initialized = false;

  constructor() {
    super('UserActivityService');
  }

  async init(): Promise<void> {
    console.log('Initializing UserActivityService');
    this.initialized = true;
  }

  async recordActivity(activityData: CreateActivityData): Promise<UserActivity> {
    try {
      console.log('Recording user activity', { 
        user_id: activityData.user_id, 
        type: activityData.activity_type 
      });
      
      // Mock implementation - replace with actual database call
      const activity: UserActivity = {
        id: this.generateId(),
        user_id: activityData.user_id,
        activity_type: activityData.activity_type,
        description: activityData.description,
        metadata: activityData.metadata,
        ip_address: activityData.ip_address,
        user_agent: activityData.user_agent,
        device_info: activityData.device_info,
        location: activityData.location,
        session_id: activityData.session_id,
        timestamp: activityData.timestamp || new Date(),
        created_at: new Date(),
      };

      return activity;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getActivityById(id: string): Promise<UserActivity | null> {
    try {
      console.log('Getting activity by ID', { id });
      
      // Mock implementation - replace with actual database call
      return null;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getUserActivities(
    userId: string,
    activityType?: string,
    limit?: number,
    offset?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserActivity[]> {
    try {
      console.log('Getting user activities', { 
        userId, 
        activityType, 
        limit, 
        offset, 
        startDate, 
        endDate 
      });
      
      // Mock implementation - replace with actual database call
      return [];
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getAllActivities(
    activityType?: string,
    limit?: number,
    offset?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserActivity[]> {
    try {
      console.log('Getting all activities', { 
        activityType, 
        limit, 
        offset, 
        startDate, 
        endDate 
      });
      
      // Mock implementation - replace with actual database call
      return [];
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getUserActivityStatsByDateRange(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityStats> {
    try {
      console.log('Getting user activity statistics', { userId, startDate, endDate });
      
      // Mock implementation - replace with actual database call
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        byType: {},
        topActivities: [],
      };
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getSystemActivityStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityStats> {
    try {
      console.log('Getting system activity statistics', { startDate, endDate });
      
      // Mock implementation - replace with actual database call
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        byType: {},
        topActivities: [],
      };
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getActiveUsers(
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{
    user_id: string;
    activity_count: number;
    last_activity: Date;
    most_common_activity: string;
  }>> {
    try {
      console.log('Getting active users', { timeframe });
      
      // Mock implementation - replace with actual database call
      return [];
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getUserSessions(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<Array<{
    session_id: string;
    start_time: Date;
    end_time?: Date;
    activity_count: number;
    duration?: number;
    device_info?: any;
    location?: any;
  }>> {
    try {
      console.log('Getting user sessions', { userId, limit, offset });
      
      // Mock implementation - replace with actual database call
      return [];
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getActivityTrends(
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day',
    activityType?: string,
    limit: number = 30
  ): Promise<Array<{
    period: string;
    count: number;
    unique_users: number;
  }>> {
    try {
      console.log('Getting activity trends', { timeframe, activityType, limit });
      
      // Mock implementation - replace with actual database call
      return [];
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async deleteOldActivities(olderThanDays: number = 90): Promise<number> {
    try {
      console.log('Deleting old activities', { olderThanDays });
      
      // Mock implementation - replace with actual database call
      return 0;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async searchActivities(
    query: string,
    filters?: {
      userId?: string;
      activityType?: string;
      startDate?: Date;
      endDate?: Date;
      ipAddress?: string;
      devicePlatform?: string;
    },
    limit?: number,
    offset?: number
  ): Promise<UserActivity[]> {
    try {
      console.log('Searching activities', { query, filters, limit, offset });
      
      // Mock implementation - replace with actual database call
      return [];
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  // Convenience methods for common activities
  async recordLogin(userId: string, sessionId: string, deviceInfo?: any, location?: any): Promise<UserActivity> {
    return this.recordActivity({
      user_id: userId,
      activity_type: 'LOGIN',
      description: 'User logged in',
      session_id: sessionId,
      device_info: deviceInfo,
      location: location,
    });
  }

  async recordLogout(userId: string, sessionId: string): Promise<UserActivity> {
    return this.recordActivity({
      user_id: userId,
      activity_type: 'LOGOUT',
      description: 'User logged out',
      session_id: sessionId,
    });
  }

  async recordJourneyCreated(userId: string, journeyId: string, metadata?: any): Promise<UserActivity> {
    return this.recordActivity({
      user_id: userId,
      activity_type: 'JOURNEY_CREATED',
      description: 'User created a new journey',
      metadata: { journey_id: journeyId, ...metadata },
    });
  }

  async recordSignUploaded(userId: string, signId: string, metadata?: any): Promise<UserActivity> {
    return this.recordActivity({
      user_id: userId,
      activity_type: 'SIGN_UPLOADED',
      description: 'User uploaded a hiking sign',
      metadata: { sign_id: signId, ...metadata },
    });
  }

  // Method for getting user activities with search parameters (for routes)
  async getUserActivitiesWithParams(searchParams: {
    user_id?: string;
    activity_type?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ activities: UserActivity[]; total: number }> {
    try {
      const activities = await this.getUserActivities(
        searchParams.user_id || '',
        searchParams.activity_type,
        searchParams.limit,
        searchParams.offset,
        searchParams.start_date,
        searchParams.end_date
      );

      // Mock total count
      const total = activities.length;

      return { activities, total };
    } catch (error) {
      this.handleError(error as Error);
      return { activities: [], total: 0 };
    }
  }

  // Alias for getActivityById to match route expectations
  async getUserActivityById(id: string): Promise<UserActivity | null> {
    return this.getActivityById(id);
  }

  // Method for creating user activity (for routes)
  async createUserActivity(activityData: any): Promise<UserActivity> {
    const createData: CreateActivityData = {
      user_id: activityData.user_id,
      activity_type: activityData.activity_type,
      description: activityData.description || `User performed ${activityData.activity_type}`,
      metadata: activityData.metadata,
      ip_address: activityData.ip_address,
      user_agent: activityData.user_agent,
      timestamp: new Date(),
    };

    return this.recordActivity(createData);
  }

  // Method for deleting user activity (for routes)
  async deleteUserActivity(id: string, userId?: string): Promise<boolean> {
    try {
      console.log('Deleting user activity', { id, userId });
      
      // Mock implementation - in real app, would check ownership and delete from database
      // For now, just return true to indicate success
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  // Enhanced getUserActivityStats method (for routes)
  async getUserActivityStats(userId: string, days: number): Promise<ActivityStats> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getUserActivityStatsByDateRange(userId, startDate, endDate);
  }

  // Method for tracking user action (for routes)
  async trackUserAction(
    userId: string,
    action: string,
    details?: any,
    req?: any
  ): Promise<UserActivity> {
    const activityData: CreateActivityData = {
      user_id: userId,
      activity_type: 'OTHER',
      description: `User performed action: ${action}`,
      metadata: {
        action,
        details,
      },
      ip_address: req?.ip || req?.connection?.remoteAddress,
      user_agent: req?.get?.('User-Agent'),
      timestamp: new Date(),
    };

    return this.recordActivity(activityData);
  }

  private generateId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    return {
      status: 'healthy',
      details: {
        service: 'UserActivityService',
        initialized: this.initialized,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down UserActivityService');
    this.initialized = false;
  }
}