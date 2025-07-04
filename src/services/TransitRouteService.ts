import { sql } from "../config/db";
import type {
  CreateTransitRouteRequest,
  RouteSearchParams,
  TransitRoute,
} from "../database/shared/models";
import { BaseService } from "./BaseService";

export class TransitRouteService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ TransitRouteService initialized");

    // Initialize routes without relying on rank_id, origin_rank_id, and destination_rank_id
    try {
      // Get all transit routes
      const routes = await sql`
        SELECT * FROM transit_routes
      `;

      if (routes.length > 0) {
        console.log(`Found ${routes.length} transit routes`);

        // Process routes to ensure they can be accessed without relying on rank_id
        for (const route of routes) {
          // Ensure route has from_location and to_location which are more reliable than rank IDs
          if (!route.from_location || !route.to_location) {
            console.warn(`Route ${route.id} missing from_location or to_location`);

            // Try to get location names from ranks if available
            if (route.origin_rank_id || route.destination_rank_id) {
              const rankInfo = await this.getRankInfoForRoute(route.id);

              if (rankInfo) {
                // Update route with location information from ranks
                await sql`
                  UPDATE transit_routes
                  SET 
                    from_location = ${rankInfo.origin_name || route.from_location},
                    to_location = ${rankInfo.destination_name || route.to_location},
                    updated_at = NOW()
                  WHERE id = ${route.id}
                `;
                console.log(`Updated route ${route.id} with location information from ranks`);
              }
            }
          }
        }
      } else {
        console.log("No transit routes found during initialization");
      }
    } catch (error) {
      console.error("Error initializing transit routes:", error);
    }
  }

  // Helper method to get rank information for a route
  private async getRankInfoForRoute(routeId: number): Promise<{ origin_name?: string; destination_name?: string } | null> {
    try {
      const [route] = await sql`
        SELECT 
          tr.id,
          origin_rank.name as origin_name,
          dr.name as destination_name
        FROM transit_routes tr
        LEFT JOIN taxi_ranks origin_rank ON tr.origin_rank_id = origin_rank.id
        LEFT JOIN taxi_ranks dr ON tr.destination_rank_id = dr.id
        WHERE tr.id = ${routeId}
      `;

      if (route) {
        return {
          origin_name: route.origin_name,
          destination_name: route.destination_name
        };
      }

      return null;
    } catch (error) {
      console.error(`Error getting rank info for route ${routeId}:`, error);
      return null;
    }
  }

  async shutdown(): Promise<void> {
    console.log("🛑 TransitRouteService shutdown");
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

  async createTransitRoute(
    routeData: CreateTransitRouteRequest,
  ): Promise<TransitRoute> {
    return this.executeQuery(async () => {
      const [route] = await sql`
        INSERT INTO transit_routes (
          user_id, origin_rank_id, destination_rank_id, route_name,
          from_location, to_location, fare, duration_minutes, distance_km,
          bus_line, departure_time, arrival_time, route_type, is_direct,
          frequency_minutes, operating_days, route_points, created_at, updated_at
        )
        VALUES (
                 ${routeData.user_id || null}, ${routeData.origin_rank_id}, ${routeData.destination_rank_id},
                 ${routeData.route_name || null}, ${routeData.from_location}, ${routeData.to_location},
                 ${routeData.fare}, ${routeData.duration_minutes || null}, ${routeData.distance_km || null},
                 ${routeData.bus_line || null}, ${routeData.departure_time || null}, ${routeData.arrival_time || null},
                 ${routeData.route_type || "taxi"}, ${routeData.is_direct ?? true}, ${routeData.frequency_minutes || null},
                 ${JSON.stringify(routeData.operating_days || [])}, ${JSON.stringify(routeData.route_points || [])},
                 NOW(), NOW()
               )
          RETURNING *
      `;
      return route as TransitRoute;
    });
  }

  async getTransitRouteById(id: number): Promise<TransitRoute | null> {
    return this.executeQuery(async () => {
      const [route] = await sql`
        SELECT tr.*,
               origin_rank.name as origin_name, origin_rank.address as origin_address,
               dr.name as destination_name, dr.address as destination_address
        FROM transit_routes tr
               LEFT JOIN taxi_ranks origin_rank ON tr.origin_rank_id = origin_rank.id
          LEFT JOIN taxi_ranks dr ON tr.destination_rank_id = dr.id
        WHERE tr.id = ${id}
      `;
      return (route as TransitRoute) || null;
    });
  }

  async getTransitRoutes(
    params: RouteSearchParams,
  ): Promise<{ routes: TransitRoute[]; total: number }> {
    return this.executeQuery(async () => {
      const {
        limit = 20,
        offset = 0,
        origin_rank_id,
        destination_rank_id,
        route_type,
        fare_min,
        fare_max,
        user_id,
      } = params;

      const whereConditions = ["1=1"];
      const queryParams: any[] = [];

      if (origin_rank_id) {
        whereConditions.push(`tr.origin_rank_id = $${queryParams.length + 1}`);
        queryParams.push(origin_rank_id);
      }

      if (destination_rank_id) {
        whereConditions.push(
          `tr.destination_rank_id = $${queryParams.length + 1}`,
        );
        queryParams.push(destination_rank_id);
      }

      if (route_type) {
        whereConditions.push(`tr.route_type = $${queryParams.length + 1}`);
        queryParams.push(route_type);
      }

      if (fare_min !== undefined) {
        whereConditions.push(`tr.fare >= $${queryParams.length + 1}`);
        queryParams.push(fare_min);
      }

      if (fare_max !== undefined) {
        whereConditions.push(`tr.fare <= $${queryParams.length + 1}`);
        queryParams.push(fare_max);
      }

      if (user_id) {
        whereConditions.push(`tr.user_id = $${queryParams.length + 1}`);
        queryParams.push(user_id);
      }

      const whereClause = whereConditions.join(" AND ");

      const routes = await sql`
        SELECT tr.*,
               origin_rank.name as origin_name, origin_rank.address as origin_address,
               dr.name as destination_name, dr.address as destination_address
        FROM transit_routes tr
               LEFT JOIN taxi_ranks origin_rank ON tr.origin_rank_id = origin_rank.id
          LEFT JOIN taxi_ranks dr ON tr.destination_rank_id = dr.id
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY tr.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM transit_routes tr
        WHERE ${sql.unsafe(whereClause)}
      `;

      return {
        routes: routes as TransitRoute[],
        total: Number.parseInt(count),
      };
    });
  }

  async updateTransitRoute(
    id: number,
    updateData: Partial<CreateTransitRouteRequest>,
  ): Promise<TransitRoute | null> {
    return this.executeQuery(async () => {
      const updateFields = Object.keys(updateData)
        .filter(
          (key) =>
            updateData[key as keyof CreateTransitRouteRequest] !== undefined,
        )
        .map((key, index) => `${key} = $${index + 2}`)
        .join(", ");

      if (!updateFields) {
        throw new Error("No fields to update");
      }

      const values = Object.keys(updateData)
        .filter(
          (key) =>
            updateData[key as keyof CreateTransitRouteRequest] !== undefined,
        )
        .map((key) => updateData[key as keyof CreateTransitRouteRequest]);

      const [route] = await sql`
        UPDATE transit_routes
        SET ${sql.unsafe(updateFields)}, updated_at = NOW()
        WHERE id = ${id}
          RETURNING *
      `;
      return (route as TransitRoute) || null;
    });
  }

  async deleteTransitRoute(id: number): Promise<boolean> {
    return this.executeQuery(async () => {
      const [result] = await sql`
        DELETE FROM transit_routes
        WHERE id = ${id}
          RETURNING id
      `;
      return !!result;
    });
  }

  async findRoutesBetweenRanks(
    originRankId: number,
    destinationRankId: number,
  ): Promise<TransitRoute[]> {
    return this.executeQuery(async () => {
      const routes = await sql`
        SELECT tr.*, 
               origin_rank.name as origin_name, origin_rank.address as origin_address,
               dr.name as destination_name, dr.address as destination_address
        FROM transit_routes tr
        LEFT JOIN taxi_ranks origin_rank ON tr.origin_rank_id = origin_rank.id
        LEFT JOIN taxi_ranks dr ON tr.destination_rank_id = dr.id
        WHERE tr.origin_rank_id = ${originRankId} 
          AND tr.destination_rank_id = ${destinationRankId}
        ORDER BY tr.fare ASC, tr.duration_minutes ASC
      `;
      return routes as TransitRoute[];
    });
  }

  async getRoutesByRank(rankId: number): Promise<TransitRoute[]> {
    return this.executeQuery(async () => {
      const routes = await sql`
        SELECT tr.*, 
               origin_rank.name as origin_name, origin_rank.address as origin_address,
               dr.name as destination_name, dr.address as destination_address
        FROM transit_routes tr
        LEFT JOIN taxi_ranks origin_rank ON tr.origin_rank_id = origin_rank.id
        LEFT JOIN taxi_ranks dr ON tr.destination_rank_id = dr.id
        WHERE tr.origin_rank_id = ${rankId} 
           OR tr.destination_rank_id = ${rankId}
        ORDER BY tr.created_at DESC
      `;
      return routes as TransitRoute[];
    });
  }

  async getDemoRoute(): Promise<TransitRoute> {
    // Return a demo transit route object
    return {
      id: 9999,
      user_id: "demo-user",
      origin_rank_id: 1,
      destination_rank_id: 2,
      route_name: "Demo Route",
      from_location: "Cape Town",
      to_location: "Johannesburg",
      fare: 150.00,
      duration_minutes: 120,
      distance_km: 1400,
      bus_line: "Demo Bus Line",
      departure_time: "08:00:00",
      arrival_time: "10:00:00",
      route_type: "taxi",
      is_direct: true,
      frequency_minutes: 30,
      operating_days: [1, 2, 3, 4, 5, 6, 7],
      route_points: [],
      metadata: {},
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      origin_name: "Cape Town Taxi Rank",
      origin_address: "123 Main St, Cape Town",
      destination_name: "Johannesburg Taxi Rank",
      destination_address: "456 Park Ave, Johannesburg"
    } as TransitRoute;
  }

  /**
   * Calculate route options between two points
   * @param params Object containing origin and destination coordinates
   * @returns Array of route options
   */
  async calculateRoutes(params: {
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    departureTime?: string;
  }): Promise<any[]> {
    return this.executeQuery(async () => {
      const { originLat, originLng, destinationLat, destinationLng, departureTime } = params;

      // Find nearby taxi ranks for origin and destination
      const originRanks = await this.findNearbyRanks(originLat, originLng, 5);
      const destinationRanks = await this.findNearbyRanks(destinationLat, destinationLng, 5);

      if (originRanks.length === 0 || destinationRanks.length === 0) {
        console.log("No nearby ranks found for origin or destination");
        return this.generateFallbackRouteOptions(params);
      }

      // Find routes between the nearest ranks
      const routes: any[] = [];

      for (const originRank of originRanks.slice(0, 2)) { // Limit to top 2 closest ranks
        for (const destRank of destinationRanks.slice(0, 2)) { // Limit to top 2 closest ranks
          if (originRank.id === destRank.id) continue; // Skip if same rank

          const rankRoutes = await this.findRoutesBetweenRanks(originRank.id, destRank.id);
          if (rankRoutes.length > 0) {
            routes.push(...rankRoutes);
          }
        }
      }

      if (routes.length === 0) {
        console.log("No routes found between nearby ranks");
        return this.generateFallbackRouteOptions(params);
      }

      // Convert routes to route options format
      return routes.slice(0, 3).map((route, index) => {
        // Calculate distance between points using Haversine formula
        const distance = this.calculateDistance(
          originLat, originLng, destinationLat, destinationLng
        );

        // Use route data if available, otherwise estimate
        const duration = route.duration_minutes || Math.round(distance * 2); // Estimate 2 min per km
        const fare = route.fare || Math.round(distance * 1.5); // Estimate R1.5 per km

        return {
          id: `route-${index + 1}`,
          estimatedDuration: duration,
          totalFare: {
            min: Math.max(10, Math.round(fare * 0.9)),
            max: Math.round(fare * 1.1)
          },
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
          routes: [
            {
              id: `segment-${index + 1}`,
              from: route.from_location || originRanks[0].name,
              to: route.to_location || destinationRanks[0].name,
              transportType: route.route_type || "taxi",
              fareRange: {
                min: Math.max(10, Math.round(fare * 0.9)),
                max: Math.round(fare * 1.1)
              },
              estimatedDuration: duration
            }
          ]
        };
      });
    });
  }

  /**
   * Find nearby taxi ranks based on coordinates
   */
  private async findNearbyRanks(lat: number, lng: number, limit: number = 5): Promise<any[]> {
    try {
      const ranks = await sql`
        SELECT id, name, latitude, longitude,
               (6371 * acos(
                 LEAST(1, GREATEST(-1, 
                   cos(radians(${lat})) * cos(radians(latitude))
                   * cos(radians(longitude) - radians(${lng}))
                   + sin(radians(${lat})) * sin(radians(latitude))
                 ))
               )) as distance
        FROM taxi_ranks
        WHERE is_active = true
        ORDER BY distance ASC
        LIMIT ${limit}
      `;
      return ranks;
    } catch (error) {
      console.error("Error finding nearby ranks:", error);
      return [];
    }
  }

  /**
   * Generate fallback route options when no actual routes are found
   */
  private generateFallbackRouteOptions(params: {
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
  }): any[] {
    const { originLat, originLng, destinationLat, destinationLng } = params;

    // Calculate distance between points using Haversine formula
    const distance = this.calculateDistance(
      originLat, originLng, destinationLat, destinationLng
    );

    // Generate estimated duration and fare based on distance
    const duration = Math.round(distance * 2); // Estimate 2 min per km
    const fare = Math.round(distance * 1.5); // Estimate R1.5 per km

    // Generate 3 route options with slight variations
    return [
      {
        id: "route-1",
        estimatedDuration: duration,
        totalFare: { min: Math.max(10, fare - 5), max: fare + 5 },
        distance: Math.round(distance * 10) / 10,
        routes: [
          {
            id: "segment-1",
            from: "Origin",
            to: "Destination",
            transportType: "taxi",
            fareRange: { min: Math.max(10, fare - 5), max: fare + 5 },
            estimatedDuration: duration
          }
        ]
      },
      {
        id: "route-2",
        estimatedDuration: Math.round(duration * 1.1),
        totalFare: { min: Math.max(10, fare - 10), max: fare },
        distance: Math.round(distance * 10) / 10,
        routes: [
          {
            id: "segment-2",
            from: "Origin",
            to: "Destination",
            transportType: "taxi",
            fareRange: { min: Math.max(10, fare - 10), max: fare },
            estimatedDuration: Math.round(duration * 1.1)
          }
        ]
      },
      {
        id: "route-3",
        estimatedDuration: Math.round(duration * 0.9),
        totalFare: { min: fare, max: fare + 15 },
        distance: Math.round(distance * 10) / 10,
        routes: [
          {
            id: "segment-3",
            from: "Origin",
            to: "Destination",
            transportType: "taxi",
            fareRange: { min: fare, max: fare + 15 },
            estimatedDuration: Math.round(duration * 0.9)
          }
        ]
      }
    ];
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
