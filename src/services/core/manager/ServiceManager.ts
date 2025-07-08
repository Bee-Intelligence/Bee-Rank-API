import type { BaseService } from "../base/BaseService";
import {
  AuthService,
  CacheService,
  EntertainmentEventService,
  EventService,
  FileStorageService,
  HikingSignService,
  JourneyService,
  LocationService,
  TaxiRankService,
  // TransitRouteService, // Not implemented yet
  UserActivityService,
  UserService,
} from "../../index";

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
      { key: "taxiRank", service: new TaxiRankService() },
      // TransitRouteService not implemented yet
      // { key: "route", service: new TransitRouteService() },
      { key: "journey", service: new JourneyService() },
      { key: "user", service: new UserService() },
      { key: "hikingSign", service: new HikingSignService() },
      { key: "userActivity", service: new UserActivityService() },
      { key: "entertainmentEvent", service: new EntertainmentEventService() },

      // Infrastructure services
      { key: "auth", service: new AuthService() },
      { key: "location", service: new LocationService() },
      { key: "fileStorage", service: new FileStorageService() },

      // Data services
      { key: "cache", service: new CacheService() },

      // Advanced services
      { key: "event", service: new EventService() },
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