import { seedAllFirebaseData } from "./firebaseSeedData";

export async function populateFirebaseDatabase() {
  try {
    await seedAllFirebaseData();
  } catch (error) {
    console.error("❌ Firebase database population failed:", error);
    throw error;
  }
}