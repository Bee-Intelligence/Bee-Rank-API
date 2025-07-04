import {seedAllData} from "./seedData";

export async function populateDatabase() {
  try {

    await seedAllData();

  } catch (error) {
    console.error("❌ Database population failed:", error);
    throw error;
  }
}



