import { sql } from "../config/db";

export async function testDatabaseConnection() {
  try {
    console.log("🔄 Testing connection to Neon.tech database...");
    
    // Execute a simple query to test the connection
    const result = await sql`SELECT NOW() as current_time`;
    
    console.log("✅ Database connection successful!");
    console.log(`Current database time: ${result[0]?.current_time}`);
    
    // Get additional database information
    const [dbInfo] = await sql`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as version
    `;


    console.log("\n📊 Database Information:");
    console.log(`Database Name: ${dbInfo.database_name}`);
    console.log(`User: ${dbInfo.user_name}`);
    console.log(`PostgreSQL Version: ${dbInfo.version}`);
    
    // List tables in the database
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log("\n📋 Available Tables:");
    if (tables.length === 0) {
      console.log("No tables found in the database.");
    } else {
      tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
}

// Execute the test function
testDatabaseConnection();