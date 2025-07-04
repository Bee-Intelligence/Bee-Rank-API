import { initializeDatabase } from "../database/initializers/tables/schema";
import { sql } from "./db";

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("📊 Database already initialized");
      return;
    }

    try {
      console.log("🔄 Initializing database...");
      await this.testConnection();
      await initializeDatabase();
      this.isInitialized = true;
      console.log("✅ Database initialization completed");
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const result = await sql`SELECT NOW() as current_time`;
      console.log(
        "✅ Database connection successful:",
        result[0]?.current_time,
      );
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }
  }

  async getConnectionInfo(): Promise<any> {
    try {
      const [dbInfo] = await sql`
        SELECT 
          current_database() as database_name,
          current_user as user_name,
          version() as version
      `;
      return dbInfo;
    } catch (error) {
      console.error("Error getting database info:", error);
      throw error;
    }
  }

  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    info?: any;
  }> {
    try {
      const info = await this.getConnectionInfo();
      return {
        status: "healthy",
        timestamp: new Date(),
        info,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date(),
        info: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }
}

export const databaseConfig = DatabaseConfig.getInstance();
export { sql };
