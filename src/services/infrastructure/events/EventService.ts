import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";
import { EventEmitter } from 'events';

export interface AppEvent {
  id: string;
  type: string;
  source: string;
  userId?: string;
  data: any;
  metadata?: {
    correlationId?: string;
    sessionId?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
  timestamp: Date;
  processed: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  error?: string;
}

export interface EventHandler {
  id: string;
  eventType: string;
  handler: (event: AppEvent) => Promise<void>;
  priority: number;
  enabled: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

export interface EventStats {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  pendingEvents: number;
  eventsByType: Record<string, number>;
  eventsBySource: Record<string, number>;
  recentEvents: number; // Last hour
}

export class EventService extends BaseService {
  private initialized = false;
  private eventEmitter: EventEmitter;
  private events: Map<string, AppEvent> = new Map();
  private handlers: Map<string, EventHandler[]> = new Map();
  private processingQueue: AppEvent[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super('EventService');
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100); // Increase limit for many handlers
  }

  async init(): Promise<void> {
    console.log('Initializing EventService');
    
    try {
      // Register default event handlers
      await this.registerDefaultHandlers();
      
      // Start processing queue
      this.startProcessing();
      
      this.initialized = true;
      console.log('EventService initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async registerDefaultHandlers(): Promise<void> {
    // User events
    await this.registerHandler('user.created', async (event) => {
      console.log('User created event:', event.data);
      // Could trigger welcome email, analytics, etc.
    });

    await this.registerHandler('user.login', async (event) => {
      console.log('User login event:', event.data);
      // Could update last login, track analytics, etc.
    });

    await this.registerHandler('user.logout', async (event) => {
      console.log('User logout event:', event.data);
      // Could clean up sessions, track analytics, etc.
    });

    // Journey events
    await this.registerHandler('journey.started', async (event) => {
      console.log('Journey started event:', event.data);
      // Could notify other users, update taxi availability, etc.
    });

    await this.registerHandler('journey.completed', async (event) => {
      console.log('Journey completed event:', event.data);
      // Could trigger review prompts, update statistics, etc.
    });

    // Location events
    await this.registerHandler('location.updated', async (event) => {
      console.log('Location updated event:', event.data);
      // Could update nearby users, trigger geofence events, etc.
    });

    // Review events
    await this.registerHandler('review.created', async (event) => {
      console.log('Review created event:', event.data);
      // Could notify reviewee, update ratings, etc.
    });

    // System events
    await this.registerHandler('system.error', async (event) => {
      console.error('System error event:', event.data);
      // Could send alerts, log to monitoring system, etc.
    });
  }

  async emit(eventType: string, data: any, options?: {
    source?: string;
    userId?: string;
    metadata?: AppEvent['metadata'];
    priority?: 'low' | 'normal' | 'high';
    maxRetries?: number;
  }): Promise<string> {
    try {
      const event: AppEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: eventType,
        source: options?.source || 'unknown',
        userId: options?.userId,
        data,
        metadata: options?.metadata,
        timestamp: new Date(),
        processed: false,
        retryCount: 0,
        maxRetries: options?.maxRetries || 3,
      };

      // Store event
      this.events.set(event.id, event);

      // Add to processing queue based on priority
      if (options?.priority === 'high') {
        this.processingQueue.unshift(event);
      } else {
        this.processingQueue.push(event);
      }

      // Emit synchronously for immediate handlers
      this.eventEmitter.emit(eventType, event);
      this.eventEmitter.emit('*', event); // Wildcard listeners

      console.log('Event emitted', { eventId: event.id, type: eventType, source: event.source });
      return event.id;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async registerHandler(
    eventType: string,
    handler: (event: AppEvent) => Promise<void>,
    options?: {
      priority?: number;
      retryOnFailure?: boolean;
      maxRetries?: number;
      enabled?: boolean;
    }
  ): Promise<string> {
    try {
      const handlerInfo: EventHandler = {
        id: `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType,
        handler,
        priority: options?.priority || 0,
        enabled: options?.enabled !== false,
        retryOnFailure: options?.retryOnFailure !== false,
        maxRetries: options?.maxRetries || 3,
      };

      // Add to handlers map
      if (!this.handlers.has(eventType)) {
        this.handlers.set(eventType, []);
      }
      this.handlers.get(eventType)!.push(handlerInfo);

      // Sort handlers by priority (higher priority first)
      this.handlers.get(eventType)!.sort((a, b) => b.priority - a.priority);

      console.log('Event handler registered', { handlerId: handlerInfo.id, eventType });
      return handlerInfo.id;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async unregisterHandler(handlerId: string): Promise<boolean> {
    try {
      for (const [eventType, handlers] of this.handlers.entries()) {
        const index = handlers.findIndex(h => h.id === handlerId);
        if (index !== -1) {
          handlers.splice(index, 1);
          if (handlers.length === 0) {
            this.handlers.delete(eventType);
          }
          console.log('Event handler unregistered', { handlerId, eventType });
          return true;
        }
      }
      return false;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        await this.processQueue();
      }
    }, 1000); // Process every second
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const event = this.processingQueue.shift()!;
        await this.processEvent(event);
      }
    } catch (error) {
      console.error('Error processing event queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: AppEvent): Promise<void> {
    try {
      const handlers = this.handlers.get(event.type) || [];
      const enabledHandlers = handlers.filter(h => h.enabled);

      if (enabledHandlers.length === 0) {
        event.processed = true;
        return;
      }

      // Process handlers in parallel
      const promises = enabledHandlers.map(async (handler) => {
        try {
          await handler.handler(event);
        } catch (error) {
          console.error(`Handler ${handler.id} failed for event ${event.id}:`, error);
          
          if (handler.retryOnFailure && event.retryCount < handler.maxRetries) {
            throw error; // Will be caught by outer try-catch for retry
          }
        }
      });

      await Promise.allSettled(promises);
      event.processed = true;
      
      console.log('Event processed successfully', { eventId: event.id, handlerCount: enabledHandlers.length });
    } catch (error) {
      // Handle retry logic
      event.retryCount++;
      event.error = (error as Error).message;

      if (event.retryCount < event.maxRetries) {
        // Schedule retry
        event.nextRetryAt = new Date(Date.now() + (event.retryCount * 5000)); // Exponential backoff
        this.processingQueue.push(event);
        
        console.log('Event scheduled for retry', { 
          eventId: event.id, 
          retryCount: event.retryCount, 
          nextRetryAt: event.nextRetryAt 
        });
      } else {
        console.error('Event failed after max retries', { eventId: event.id, error: event.error });
      }
    }
  }

  async getEvent(eventId: string): Promise<AppEvent | null> {
    try {
      return this.events.get(eventId) || null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async getEvents(filters?: {
    type?: string;
    source?: string;
    userId?: string;
    processed?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AppEvent[]> {
    try {
      let events = Array.from(this.events.values());

      // Apply filters
      if (filters?.type) {
        events = events.filter(e => e.type === filters.type);
      }

      if (filters?.source) {
        events = events.filter(e => e.source === filters.source);
      }

      if (filters?.userId) {
        events = events.filter(e => e.userId === filters.userId);
      }

      if (filters?.processed !== undefined) {
        events = events.filter(e => e.processed === filters.processed);
      }

      if (filters?.dateFrom) {
        events = events.filter(e => e.timestamp >= filters.dateFrom!);
      }

      if (filters?.dateTo) {
        events = events.filter(e => e.timestamp <= filters.dateTo!);
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      if (filters?.offset) {
        events = events.slice(filters.offset);
      }

      if (filters?.limit) {
        events = events.slice(0, filters.limit);
      }

      return events;
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async getEventStats(): Promise<EventStats> {
    try {
      const events = Array.from(this.events.values());
      
      const stats: EventStats = {
        totalEvents: events.length,
        processedEvents: events.filter(e => e.processed).length,
        failedEvents: events.filter(e => e.retryCount >= e.maxRetries && !e.processed).length,
        pendingEvents: events.filter(e => !e.processed && e.retryCount < e.maxRetries).length,
        eventsByType: {},
        eventsBySource: {},
        recentEvents: 0,
      };

      // Count by type
      events.forEach(e => {
        stats.eventsByType[e.type] = (stats.eventsByType[e.type] || 0) + 1;
      });

      // Count by source
      events.forEach(e => {
        stats.eventsBySource[e.source] = (stats.eventsBySource[e.source] || 0) + 1;
      });

      // Count recent events (last hour)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      stats.recentEvents = events.filter(e => e.timestamp >= oneHourAgo).length;

      return stats;
    } catch (error) {
      this.handleError(error as Error);
      return {
        totalEvents: 0,
        processedEvents: 0,
        failedEvents: 0,
        pendingEvents: 0,
        eventsByType: {},
        eventsBySource: {},
        recentEvents: 0,
      };
    }
  }

  async retryFailedEvents(): Promise<number> {
    try {
      const failedEvents = Array.from(this.events.values())
        .filter(e => !e.processed && e.retryCount < e.maxRetries);

      let retriedCount = 0;
      for (const event of failedEvents) {
        // Reset retry info
        event.error = undefined;
        event.nextRetryAt = undefined;
        
        // Add back to queue
        this.processingQueue.push(event);
        retriedCount++;
      }

      console.log(`Retrying ${retriedCount} failed events`);
      return retriedCount;
    } catch (error) {
      this.handleError(error as Error);
      return 0;
    }
  }

  async cleanupOldEvents(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldEvents = Array.from(this.events.values())
        .filter(e => e.timestamp < cutoffDate && e.processed);

      let deletedCount = 0;
      for (const event of oldEvents) {
        this.events.delete(event.id);
        deletedCount++;
      }

      console.log(`Cleaned up ${deletedCount} old events`);
      return deletedCount;
    } catch (error) {
      this.handleError(error as Error);
      return 0;
    }
  }

  // Convenience methods for common events
  async emitUserEvent(eventType: string, userId: string, data: any): Promise<string> {
    return this.emit(eventType, data, {
      source: 'user-service',
      userId,
    });
  }

  async emitJourneyEvent(eventType: string, journeyData: any): Promise<string> {
    return this.emit(eventType, journeyData, {
      source: 'journey-service',
      userId: journeyData.userId,
    });
  }

  async emitLocationEvent(eventType: string, locationData: any): Promise<string> {
    return this.emit(eventType, locationData, {
      source: 'location-service',
      userId: locationData.userId,
    });
  }

  async emitSystemEvent(eventType: string, data: any, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<string> {
    return this.emit(eventType, data, {
      source: 'system',
      priority,
    });
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const stats = await this.getEventStats();
    
    return {
      status: 'healthy',
      details: {
        service: 'EventService',
        initialized: this.initialized,
        queueSize: this.processingQueue.length,
        isProcessing: this.isProcessing,
        handlerCount: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
        stats,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down EventService');
    
    // Stop processing
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Process remaining events
    if (this.processingQueue.length > 0) {
      console.log(`Processing ${this.processingQueue.length} remaining events`);
      await this.processQueue();
    }

    // Clear data
    this.events.clear();
    this.handlers.clear();
    this.processingQueue = [];
    this.eventEmitter.removeAllListeners();
    
    this.initialized = false;
  }
}