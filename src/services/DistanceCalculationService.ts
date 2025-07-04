import { BaseService } from "./BaseService";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DistanceMatrix {
  origin: Coordinates;
  destination: Coordinates;
  distance: number;
  duration: number;
}

export class DistanceCalculationService extends BaseService {
  private readonly EARTH_RADIUS = 6371; // Earth's radius in kilometers

  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ DistanceCalculationService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 DistanceCalculationService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      // Test basic calculation functionality
      const testPoint1: Coordinates = { latitude: 0, longitude: 0 };
      const testPoint2: Coordinates = { latitude: 1, longitude: 1 };
      const testDistance = this.calculateDistance(testPoint1, testPoint2);

      return {
        status: "healthy",
        details: {
          earthRadius: this.EARTH_RADIUS,
          testCalculation: testDistance > 0,
          testDistance: testDistance,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        status: "unhealthy",
        details: { error: errorMessage },
      };
    }
  }

  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    try {
      // Validate input coordinates
      this.validateCoordinates(point1);
      this.validateCoordinates(point2);

      const lat1 = this.toRadians(point1.latitude);
      const lon1 = this.toRadians(point1.longitude);
      const lat2 = this.toRadians(point2.latitude);
      const lon2 = this.toRadians(point2.longitude);

      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) *
          Math.cos(lat2) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return this.EARTH_RADIUS * c;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private validateCoordinates(coords: Coordinates): void {
    if (
      typeof coords.latitude !== "number" ||
      typeof coords.longitude !== "number"
    ) {
      throw new Error(
        "Invalid coordinates: latitude and longitude must be numbers",
      );
    }

    if (coords.latitude < -90 || coords.latitude > 90) {
      throw new Error("Invalid latitude: must be between -90 and 90 degrees");
    }

    if (coords.longitude < -180 || coords.longitude > 180) {
      throw new Error(
        "Invalid longitude: must be between -180 and 180 degrees",
      );
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async calculateRouteDistance(points: Coordinates[]): Promise<number> {
    return this.executeQuery(async () => {
      if (!points || points.length < 2) {
        throw new Error("Route must contain at least 2 points");
      }

      let totalDistance = 0;

      for (let i = 0; i < points.length - 1; i++) {
        totalDistance += this.calculateDistance(points[i], points[i + 1]);
      }

      return totalDistance;
    });
  }

  async estimateDuration(
    distance: number,
    trafficFactor = 1,
    speedKmH = 50,
  ): Promise<number> {
    return this.executeQuery(async () => {
      if (distance < 0) {
        throw new Error("Distance cannot be negative");
      }

      if (trafficFactor <= 0) {
        throw new Error("Traffic factor must be positive");
      }

      if (speedKmH <= 0) {
        throw new Error("Speed must be positive");
      }

      // Returns duration in minutes
      return (distance / speedKmH) * 60 * trafficFactor;
    });
  }

  async calculateDistanceMatrix(
    origins: Coordinates[],
    destinations: Coordinates[],
  ): Promise<DistanceMatrix[]> {
    return this.executeQuery(async () => {
      if (!origins || origins.length === 0) {
        throw new Error("Origins array cannot be empty");
      }

      if (!destinations || destinations.length === 0) {
        throw new Error("Destinations array cannot be empty");
      }

      const matrix: DistanceMatrix[] = [];

      for (const origin of origins) {
        for (const destination of destinations) {
          const distance = this.calculateDistance(origin, destination);
          const duration = await this.estimateDuration(distance);

          matrix.push({
            origin,
            destination,
            distance,
            duration,
          });
        }
      }

      return matrix;
    });
  }

  async optimizeRoute(points: Coordinates[]): Promise<Coordinates[]> {
    return this.executeQuery(async () => {
      if (!points || points.length < 2) {
        throw new Error("Route optimization requires at least 2 points");
      }

      if (points.length === 2) {
        return [...points]; // No optimization needed for 2 points
      }

      // Simple nearest neighbor algorithm for route optimization
      const optimizedRoute: Coordinates[] = [points[0]];
      const remaining = points.slice(1);

      while (remaining.length > 0) {
        const current = optimizedRoute[optimizedRoute.length - 1];
        let minDistance = Number.POSITIVE_INFINITY;
        let nextIndex = 0;

        for (let i = 0; i < remaining.length; i++) {
          const distance = this.calculateDistance(current, remaining[i]);
          if (distance < minDistance) {
            minDistance = distance;
            nextIndex = i;
          }
        }

        optimizedRoute.push(remaining[nextIndex]);
        remaining.splice(nextIndex, 1);
      }

      return optimizedRoute;
    });
  }

  async calculateBearing(
    point1: Coordinates,
    point2: Coordinates,
  ): Promise<number> {
    return this.executeQuery(async () => {
      this.validateCoordinates(point1);
      this.validateCoordinates(point2);

      const lat1 = this.toRadians(point1.latitude);
      const lat2 = this.toRadians(point2.latitude);
      const dLon = this.toRadians(point2.longitude - point1.longitude);

      const y = Math.sin(dLon) * Math.cos(lat2);
      const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

      let bearing = Math.atan2(y, x);
      bearing = (bearing * 180) / Math.PI;
      bearing = (bearing + 360) % 360;

      return bearing;
    });
  }

  async findPointsWithinRadius(
    center: Coordinates,
    points: Coordinates[],
    radiusKm: number,
  ): Promise<{ point: Coordinates; distance: number }[]> {
    return this.executeQuery(async () => {
      this.validateCoordinates(center);

      if (radiusKm <= 0) {
        throw new Error("Radius must be positive");
      }

      const pointsWithinRadius: { point: Coordinates; distance: number }[] = [];

      for (const point of points) {
        const distance = this.calculateDistance(center, point);
        if (distance <= radiusKm) {
          pointsWithinRadius.push({ point, distance });
        }
      }

      // Sort by distance (closest first)
      pointsWithinRadius.sort((a, b) => a.distance - b.distance);

      return pointsWithinRadius;
    });
  }

  async calculateMidpoint(
    point1: Coordinates,
    point2: Coordinates,
  ): Promise<Coordinates> {
    return this.executeQuery(async () => {
      this.validateCoordinates(point1);
      this.validateCoordinates(point2);

      const lat1 = this.toRadians(point1.latitude);
      const lon1 = this.toRadians(point1.longitude);
      const lat2 = this.toRadians(point2.latitude);
      const dLon = this.toRadians(point2.longitude - point1.longitude);

      const bx = Math.cos(lat2) * Math.cos(dLon);
      const by = Math.cos(lat2) * Math.sin(dLon);

      const midLat = Math.atan2(
        Math.sin(lat1) + Math.sin(lat2),
        Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by),
      );

      const midLon = lon1 + Math.atan2(by, Math.cos(lat1) + bx);

      return {
        latitude: (midLat * 180) / Math.PI,
        longitude: (midLon * 180) / Math.PI,
      };
    });
  }

  async getRouteStatistics(points: Coordinates[]): Promise<{
    totalDistance: number;
    estimatedDuration: number;
    numberOfPoints: number;
    averageSegmentDistance: number;
  }> {
    return this.executeQuery(async () => {
      const totalDistance = await this.calculateRouteDistance(points);
      const estimatedDuration = await this.estimateDuration(totalDistance);
      const numberOfPoints = points.length;
      const averageSegmentDistance =
        numberOfPoints > 1 ? totalDistance / (numberOfPoints - 1) : 0;

      return {
        totalDistance,
        estimatedDuration,
        numberOfPoints,
        averageSegmentDistance,
      };
    });
  }
}
