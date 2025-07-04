import { sql } from "../config/db.ts";

export async function resetTaxiRanksSequence() {
  try {
    await sql`
            SELECT setval(
                pg_get_serial_sequence('taxi_ranks', 'id'),
                COALESCE((SELECT MAX(id) FROM taxi_ranks), 0) + 1,
                false
            );
        `;
    console.log("Taxi ranks sequence reset successfully");
  } catch (error) {
    console.error("Failed to reset sequence:", error);
    throw error;
  }
}
