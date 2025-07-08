import { populateDatabase } from "../seeds/populateDatabase";
import {createAllTables} from "./tables/schema";
import {createIndexes} from "./indexes/indexes";
import { initializeFirebaseDatabase } from "./initializeFirebaseDatabase";

export async function initializeDatabase() {
  try {
    console.log("🔄 Initializing Bee Rank database...");

    // Execute PostgreSQL schema creation step by step
    await createAllTables();
    await createIndexes();

    // Run PostgreSQL and Firebase initialization concurrently
    console.log("🔄 Initializing PostgreSQL and Firebase databases concurrently...");
    
    const [postgresResult, firebaseResult] = await Promise.allSettled([
      populateDatabase(),
      initializeFirebaseDatabase()
    ]);

    // Check results
    if (postgresResult.status === 'rejected') {
      console.error("❌ PostgreSQL database population failed:", postgresResult.reason);
    } else {
      console.log("✅ PostgreSQL database population completed successfully");
    }

    if (firebaseResult.status === 'rejected') {
      console.error("❌ Firebase database initialization failed:", firebaseResult.reason);
    } else {
      console.log("✅ Firebase database initialization completed successfully");
    }

    // If both succeeded, log overall success
    if (postgresResult.status === 'fulfilled' && firebaseResult.status === 'fulfilled') {
      console.log("✅ Database initialization completed successfully (PostgreSQL + Firebase)");
    } else {
      console.warn("⚠️ Database initialization completed with some failures");
    }

  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}