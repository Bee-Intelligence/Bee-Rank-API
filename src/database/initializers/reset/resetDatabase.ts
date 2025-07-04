import {dropAllTables} from "../delete/dropTables";
import {initializeDatabase} from "../initializeDatabase";

export async function resetDatabase() {
    await dropAllTables();
    await initializeDatabase();
}
