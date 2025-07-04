# Database Connection Scripts

This directory contains scripts for testing and managing database connections.

## Test Database Connection

The `testDbConnection.ts` script allows you to test the connection to your Neon.tech database and view basic information about the database.

### How to Run

From the backend directory, run:

```bash
npx ts-node src/scripts/testDbConnection.ts
```

### What It Does

The script:

1. Tests the connection to your Neon.tech database
2. Displays the current database time
3. Shows database information (name, user, PostgreSQL version)
4. Lists all tables in the database

### Expected Output

If the connection is successful, you should see output similar to:

```
🔄 Testing connection to Neon.tech database...
✅ Database connection successful!
Current database time: 2023-06-30T15:30:45.123Z

📊 Database Information:
Database Name: Bee Rank
User: Bee Rank_owner
PostgreSQL Version: PostgreSQL 15.3 on x86_64-pc-linux-gnu...

📋 Available Tables:
1. hiking_signs
2. taxi_ranks
3. user_activities
4. users
...
```

If the connection fails, you'll see an error message with details about what went wrong.

## Troubleshooting

If you encounter connection issues:

1. Check that your `.env` file in the backend directory contains the correct `DB_URL` value
2. Verify that your Neon.tech database is running and accessible
3. Check if your IP address is allowed in Neon.tech's connection settings
4. Ensure you have the necessary permissions to access the database

## Database Connection in the Application

The application connects to the Neon.tech database using:

1. The `@neondatabase/serverless` package
2. The connection string from the `DB_URL` environment variable
3. The `neon` function to create a SQL client

The connection is established in `src/config/db.ts` and used throughout the application.