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
        
        // Email service indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_templates_key ON email_templates(template_key)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_templates_active ON email_templates(is_active)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_queue_status ON email_queue(status)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_queue_priority ON email_queue(priority)`;
        
        // Feature flags indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_flags_active ON feature_flags(is_active)`;
        
        // Auth sessions indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_session_id ON auth_sessions(session_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(is_active)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at)`;
        
        // Cache entries indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_entries_key ON cache_entries(cache_key)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_entries_expires ON cache_entries(expires_at)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_entries_accessed ON cache_entries(last_accessed)`;
        
        // WebSocket sessions indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websocket_sessions_user ON websocket_sessions(user_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websocket_sessions_session_id ON websocket_sessions(session_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websocket_sessions_status ON websocket_sessions(status)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websocket_sessions_room ON websocket_sessions(room)`;

        // Entertainment events indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entertainment_events_type ON entertainment_events(event_type)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entertainment_events_location ON entertainment_events(latitude, longitude)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entertainment_events_city ON entertainment_events(city)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entertainment_events_province ON entertainment_events(province)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entertainment_events_date ON entertainment_events(event_date)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entertainment_events_active ON entertainment_events(is_active)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entertainment_events_featured ON entertainment_events(is_featured)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entertainment_events_price ON entertainment_events(price_min, price_max)`;
        
        // User event bookmarks indexes
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_event_bookmarks_user ON user_event_bookmarks(user_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_event_bookmarks_event ON user_event_bookmarks(event_id)`;
        await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_event_bookmarks_user_event ON user_event_bookmarks(user_id, event_id)`;

        console.log("✅ All indexes created successfully");
    } catch (error) {
        console.error("❌ Failed to create indexes:", error);
        throw error;
    }
}
