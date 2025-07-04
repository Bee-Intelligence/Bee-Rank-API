import { populateDatabase } from "../seeds/populateDatabase";
import {createAllTables, createTables} from "./tables/schema";
import {createIndexes} from "./indexes/indexes";

export async function initializeDatabase() {
  try {
    console.log("🔄 Initializing Bee Rank database...");

    // Execute schema creation step by step
    await createTables();
    await createAllTables();
    await createIndexes();

    // Populate with sample data
    await populateDatabase();

    console.log("✅ Database initialization completed successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}