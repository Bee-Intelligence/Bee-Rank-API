import { storage } from "../storage/DatabaseStorage";
import { BaseService } from "./BaseService";

export interface UserLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface NearbyEntitiesQuery {
  latitude: number;
  longitude: number;
  radius: number;
  type: "taxi_ranks" | "hiking_signs";
}

export class LocationService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ LocationService initialized");
  }

  async updateUserLocation(
    userId: string,
    locationData: UserLocationData,
  ): Promise<void> {
    try {
      // Here you would typically save the User's location to the database
      // For now, we'll just log it
      console.log(`Updating location for user ${userId}:`, locationData);

      // You might want to save this to a user_locations table or update the User record
      // Example implementation:
      /*
      await storage.updateUserLocation(userId, {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: new Date()
      });
      */
    } catch (error) {
      console.error("Error updating User location:", error);
      throw error;
    }
  }

  async getNearbyEntities(query: NearbyEntitiesQuery): Promise<any[]> {
    try {
      const { latitude, longitude, radius, type } = query;

      switch (type) {
        case "taxi_ranks":
          return await storage.getNearbyTaxiRanks(latitude, longitude, radius);

        case "hiking_signs":
          // Assuming you have a method for nearby hiking signs
          // If not, you'll need to implement this in DatabaseStorage
          return []; // placeholder

        default:
          throw new Error(`Unsupported entity type: ${type}`);
      }
    } catch (error) {
      console.error("Error fetching nearby entities:", error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return {
      status: "healthy",
      details: {
        service: "LocationService",
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log("🛑 LocationService shutdown");
  }
}
