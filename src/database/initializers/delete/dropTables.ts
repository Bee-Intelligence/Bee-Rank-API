import {sql} from "../../../config/db";

export async function dropAllTables() {
    try {
        console.log("🗑️ Dropping all tables...");

        await sql`
            DROP TABLE IF EXISTS review_votes CASCADE;
            DROP TABLE IF EXISTS reviews CASCADE;
            DROP TABLE IF EXISTS api_rate_limits CASCADE;
            DROP TABLE IF EXISTS system_settings CASCADE;
            DROP TABLE IF EXISTS files CASCADE;
            DROP TABLE IF EXISTS notifications CASCADE;
            DROP TABLE IF EXISTS user_devices CASCADE;
            DROP TABLE IF EXISTS location_history CASCADE;
            DROP TABLE IF EXISTS analytics_events CASCADE;
            DROP TABLE IF EXISTS user_activities CASCADE;
            DROP TABLE IF EXISTS hiking_signs CASCADE;
            DROP TABLE IF EXISTS taxis_nearby CASCADE;
            DROP TABLE IF EXISTS route_connections CASCADE;
            DROP TABLE IF EXISTS journeys CASCADE;
            DROP TABLE IF EXISTS transit_routes CASCADE;
            DROP TABLE IF EXISTS taxi_ranks CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        `;

        console.log("✅ All tables dropped successfully");
    } catch (error) {
        console.error("❌ Failed to drop tables:", error);
        throw error;
    }
}