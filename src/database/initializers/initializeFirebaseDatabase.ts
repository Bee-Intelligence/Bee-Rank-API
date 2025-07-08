import { populateFirebaseDatabase } from "../seeds/populateFirebaseDatabase";
import { createFirebaseCollections } from "./collections/firebaseCollections";

export async function initializeFirebaseDatabase() {
  try {
    console.log("🔄 Initializing Bee Rank Firebase database...");

    // Create collections and set up initial structure
    await createFirebaseCollections();

    // Populate with sample data
    await populateFirebaseDatabase();

    console.log("✅ Firebase database initialization completed successfully");
  } catch (error) {
    console.error("❌ Firebase database initialization failed:", error);
    throw error;
  }
}