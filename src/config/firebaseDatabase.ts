import { initializeFirebaseDatabase } from "../database/initializers/initializeFirebaseDatabase";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export class FirebaseDatabaseConfig {
  private static instance: FirebaseDatabaseConfig;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): FirebaseDatabaseConfig {
    if (!FirebaseDatabaseConfig.instance) {
      FirebaseDatabaseConfig.instance = new FirebaseDatabaseConfig();
    }
    return FirebaseDatabaseConfig.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("📊 Firebase database already initialized");
      return;
    }

    try {
      console.log("🔄 Initializing Firebase database...");
      await this.testConnection();
      await initializeFirebaseDatabase();
      this.isInitialized = true;
      console.log("✅ Firebase database initialization completed");
    } catch (error) {
      console.error("❌ Firebase database initialization failed:", error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      // Test connection by trying to read from a system collection
      const testCollection = collection(db, 'system_test');
      await getDocs(testCollection);
      console.log("✅ Firebase database connection successful");
    } catch (error) {
      console.error("❌ Firebase database connection failed:", error);
      throw error;
    }
  }

  async getConnectionInfo(): Promise<any> {
    try {
      // Get Firebase project info
      const projectId = db.app.options.projectId;
      return {
        project_id: projectId,
        database_type: 'firestore',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error getting Firebase database info:", error);
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

  getDatabase() {
    return db;
  }
}

export const firebaseDatabaseConfig = FirebaseDatabaseConfig.getInstance();
export { db };