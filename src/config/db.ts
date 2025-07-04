import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  console.error("❌ DB_URL environment variable is not set!");
  console.log("Please create a .env file in the backend directory with:");
  console.log("DB_URL=your_neon_database_connection_string");
  process.exit(1);
}

export const sql = neon(dbUrl);
