import type { BaseService } from "./BaseService";
import {
  AnalyticsService,
  AuthService,
  CacheService,
  EmailService,
  ErrorTrackingService,
  EventService,
  FileStorageService,
  HealthService,
  HikingSignService,
  I18nService,
  JobService,
  JourneyService,
  LocationService,
  LoggingService,
  MigrationService,
  MonitoringService,
  NotificationService,
  PerformanceService,
  RateLimitService,
  SearchService,
  TaxiRankService,
  TransitRouteService,
  UserActivityService,
  UserService,
  ValidationService,
} from "./index";

export class ServiceManager {
  private static instance: ServiceManager;
  private services: Map<string, BaseService> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("📋 Service Manager already initialized");
      return;
    }

    try {
      console.log("🔄 Initializing services...");
      await this.initializeServices();
      await this.validateServices();
      this.isInitialized = true;
      console.log("✅ All services initialized successfully");
    } catch (error) {
      console.error("❌ Service initialization failed:", error);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    const serviceDefinitions = [
      // Core business services
      { key: "taxiRank", service: new TaxiRankService("taxiRank") },
      { key: "route", service: new TransitRouteService("route") },
      { key: "journey", service: new JourneyService("journey") },
      { key: "user", service: new UserService("user") },
      { key: "hikingSign", service: new HikingSignService("hikingSign") },
      { key: "userActivity", service: new UserActivityService("userActivity") },

      // Infrastructure services
      { key: "auth", service: new AuthService("auth") },
      { key: "location", service: new LocationService("location") },
      { key: "notification", service: new NotificationService("notification") },
      { key: "fileStorage", service: new FileStorageService("fileStorage") },

      // Data services
      { key: "cache", service: new CacheService("cache") },
      { key: "search", service: new SearchService("search") },

      // Utility services
      { key: "validation", service: new ValidationService("validation") },
      { key: "analytics", service: new AnalyticsService("analytics") },
      { key: "email", service: new EmailService("email") },
      { key: "logging", service: new LoggingService("logging") },
      { key: "monitoring", service: new MonitoringService("monitoring") },
      { key: "health", service: new HealthService("health") },

      // Advanced services
      { key: "rateLimit", service: new RateLimitService("rateLimit") },
      { key: "performance", service: new PerformanceService("performance") },
      {
        key: "errorTracking",
        service: new ErrorTrackingService("errorTracking"),
      },
      { key: "event", service: new EventService("event") },
      { key: "i18n", service: new I18nService("i18n") },
      { key: "job", service: new JobService("job") },
      { key: "migration", service: new MigrationService("migration") },
    ];

    // Initialize services in batches for better performance
    const initPromises = serviceDefinitions.map(async ({ key, service }) => {
      try {
        await service.initialize();
        this.services.set(key, service);
        console.log(`✅ ${key} service initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${key} service:`, error);
        throw error;
      }
    });

    await Promise.all(initPromises);
  }

  private async validateServices(): Promise<void> {
    const validationPromises = Array.from(this.services.entries()).map(
      async ([key, service]) => {
        try {
          const healthCheck = await service.healthCheck();
          if (healthCheck.status !== "healthy") {
            throw new Error(
              `Service ${key} health check failed: ${healthCheck.status}`,
            );
          }
        } catch (error) {
          console.error(`❌ Service ${key} validation failed:`, error);
          throw error;
        }
      },
    );

    await Promise.all(validationPromises);
  }

  getService<T extends BaseService>(key: string): T | null {
    const service = this.services.get(key);
    return (service as T) || null;
  }

  getAllServices(): Map<string, BaseService> {
    return new Map(this.services);
  }

  async healthCheck(): Promise<{ [key: string]: any }> {
    const healthChecks: { [key: string]: any } = {};

    for (const [key, service] of this.services.entries()) {
      try {
        const healthCheck = await service.healthCheck();
        healthChecks[key] = {
          status: healthCheck.status,
          details: healthCheck.details,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        healthChecks[key] = {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    }

    return healthChecks;
  }

  async shutdown(): Promise<void> {
    console.log("🛑 Shutting down services...");

    const shutdownPromises = Array.from(this.services.values()).map(
      async (service) => {
        try {
          await service.shutdown();
        } catch (error) {
          console.error("Error during service shutdown:", error);
        }
      },
    );

    await Promise.all(shutdownPromises);
    this.services.clear();
    this.isInitialized = false;
    console.log("✅ All services shut down successfully");
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  getServiceCount(): number {
    return this.services.size;
  }
}
