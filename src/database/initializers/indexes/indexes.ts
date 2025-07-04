import {sql} from "../../../config/db";

export async function createIndexes() {
    try {
        console.log("🔍 Creating indexes...");

        // Users indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active)`;
        // Taxi ranks indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_location ON taxi_ranks(latitude, longitude)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_city ON taxi_ranks(city)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_province ON taxi_ranks(province)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_active ON taxi_ranks(is_active)`;
        // Transit routes indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_origin ON transit_routes(origin_rank_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_destination ON transit_routes(destination_rank_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_type ON transit_routes(route_type)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_active ON transit_routes(is_active)`;
        // Journeys indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_user ON journeys(user_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_status ON journeys(status)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_journey_id ON journeys(journey_id)`;
        // User activities indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_user ON user_activities(user_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type)`;
        // Analytics indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp)`;

        console.log("✅ All indexes created successfully");
    } catch (error) {
        console.error("❌ Failed to create indexes:", error);
        throw error;
    }
}
