import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  type Firestore,
} from "firebase/firestore";
import { sql } from "../../../config/db";
import { BaseService } from "../../core/base/BaseService";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface BackupOptions {
  tables?: string[];
  batchSize?: number;
  includeDeleted?: boolean;
}

export class FirebaseBackupService extends BaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private config: FirebaseConfig | null = null;

  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    try {
      // Check if Firebase configuration is available
      const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      };

      // Check if all required fields are present
      const requiredFields = [
        "apiKey",
        "authDomain",
        "projectId",
        "storageBucket",
        "messagingSenderId",
        "appId",
      ];

      const missingFields = requiredFields.filter(
        field => !firebaseConfig[field as keyof typeof firebaseConfig]
      );

      if (missingFields.length > 0) {
        console.warn(`⚠️  Firebase configuration incomplete. Missing: ${missingFields.join(", ")}`);
        console.warn("⚠️  FirebaseBackupService will run in disabled mode");
        return;
      }

      this.config = firebaseConfig as FirebaseConfig;
      this.app = initializeApp(this.config);
      this.db = getFirestore(this.app);

      console.log("✅ FirebaseBackupService initialized successfully");
    } catch (error) {
      console.warn("⚠️  Failed to initialize FirebaseBackupService:", error);
      console.warn("⚠️  FirebaseBackupService will run in disabled mode");
      // Don't throw error - allow server to continue without Firebase backup
    }
  }

  async shutdown(): Promise<void> {
    this.app = null;
    this.db = null;
    this.config = null;
    console.log("🛑 FirebaseBackupService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.db) {
        return { status: "unhealthy", details: { error: "Firebase not initialized" } };
      }

      // Test Firebase connection by reading a small collection
      const testCollection = collection(this.db, "health_check");
      await getDocs(query(testCollection, limit(1)));

      return {
        status: "healthy",
        details: {
          firebase: "connected",
          projectId: this.config?.projectId,
        },
      };
    } catch (error: any) {
      return {
        status: "unhealthy",
        details: { error: error?.message || "Unknown error" },
      };
    }
  }

  /**
   * Backup all tables to Firebase
   */
  async backupAllTables(options: BackupOptions = {}): Promise<{
    success: boolean;
    tablesBackedUp: string[];
    errors: string[];
  }> {
    if (!this.db) {
      console.warn("⚠️  Firebase backup not available - service running in disabled mode");
      return {
        success: false,
        tablesBackedUp: [],
        errors: ["Firebase not initialized - backup service disabled"],
      };
    }

    const { batchSize = 100 } = options;
    const tablesBackedUp: string[] = [];
    const errors: string[] = [];

    const tables = options.tables || [
      "users",
      "taxi_ranks",
      "transit_routes",
      "journeys",
      "hiking_signs",
      "user_activities",
      "analytics_events",
      "location_history",
      "notifications",
      "files",
      "reviews",
    ];

    for (const tableName of tables) {
      try {
        console.log(`🔄 Backing up table: ${tableName}`);
        await this.backupTable(tableName, { batchSize });
        tablesBackedUp.push(tableName);
        console.log(`✅ Successfully backed up table: ${tableName}`);
      } catch (error) {
        const errorMsg = `Failed to backup table ${tableName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    return {
      success: errors.length === 0,
      tablesBackedUp,
      errors,
    };
  }

  /**
   * Backup a specific table to Firebase
   */
  async backupTable(
    tableName: string,
    options: { batchSize?: number } = {},
  ): Promise<void> {
    if (!this.db) {
      console.warn("⚠️  Firebase backup not available - skipping table backup");
      return;
    }

    const { batchSize = 100 } = options;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const rows = await sql`
        SELECT * FROM ${sql.unsafe(tableName)}
        ORDER BY created_at DESC
        LIMIT ${batchSize} OFFSET ${offset}
      `;

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      // Create backup collection with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupCollection = collection(
        this.db,
        `backups/${timestamp}/${tableName}`,
      );

      // Batch write to Firebase
      const promises = rows.map(async (row, index) => {
        const docId = row.id?.toString() || `${offset + index}`;
        const docRef = doc(backupCollection, docId);
        
        // Convert dates to ISO strings for Firebase
        const processedRow = this.processRowForFirebase(row);
        
        return setDoc(docRef, {
          ...processedRow,
          backup_timestamp: new Date().toISOString(),
          table_name: tableName,
        });
      });

      await Promise.all(promises);

      offset += batchSize;
      hasMore = rows.length === batchSize;

      console.log(`📦 Backed up ${rows.length} records from ${tableName} (offset: ${offset})`);
    }
  }

  /**
   * Backup specific records by IDs
   */
  async backupRecords(
    tableName: string,
    recordIds: (string | number)[],
  ): Promise<void> {
    if (!this.db) {
      console.warn("⚠️  Firebase backup not available - skipping record backup");
      return;
    }

    if (recordIds.length === 0) {
      return;
    }

    const placeholders = recordIds.map((_, index) => `$${index + 1}`).join(",");
    const rows = await sql`
      SELECT * FROM ${sql.unsafe(tableName)}
      WHERE id IN (${sql.unsafe(placeholders)})
    `;

    if (rows.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupCollection = collection(
      this.db,
      `backups/${timestamp}/${tableName}`,
    );

    const promises = rows.map(async (row) => {
      const docId = row.id?.toString();
      if (!docId) return;

      const docRef = doc(backupCollection, docId);
      const processedRow = this.processRowForFirebase(row);

      return setDoc(docRef, {
        ...processedRow,
        backup_timestamp: new Date().toISOString(),
        table_name: tableName,
      });
    });

    await Promise.all(promises);
    console.log(`✅ Backed up ${rows.length} specific records from ${tableName}`);
  }

  /**
   * Create incremental backup (only recent changes)
   */
  async createIncrementalBackup(
    sinceDate: Date,
    options: BackupOptions = {},
  ): Promise<{
    success: boolean;
    tablesBackedUp: string[];
    recordsBackedUp: number;
    errors: string[];
  }> {
    if (!this.db) {
      console.warn("⚠️  Firebase backup not available - skipping incremental backup");
      return {
        success: false,
        tablesBackedUp: [],
        recordsBackedUp: 0,
        errors: ["Firebase not initialized - backup service disabled"],
      };
    }

    const { batchSize = 100 } = options;
    const tablesBackedUp: string[] = [];
    const errors: string[] = [];
    let totalRecordsBackedUp = 0;

    const tables = options.tables || [
      "users",
      "taxi_ranks",
      "transit_routes",
      "journeys",
      "hiking_signs",
      "user_activities",
      "analytics_events",
      "location_history",
      "notifications",
      "files",
      "reviews",
    ];

    for (const tableName of tables) {
      try {
        console.log(`🔄 Creating incremental backup for table: ${tableName}`);
        const recordsCount = await this.backupTableIncremental(
          tableName,
          sinceDate,
          { batchSize },
        );
        tablesBackedUp.push(tableName);
        totalRecordsBackedUp += recordsCount;
        console.log(`✅ Backed up ${recordsCount} records from ${tableName}`);
      } catch (error) {
        const errorMsg = `Failed to backup table ${tableName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    return {
      success: errors.length === 0,
      tablesBackedUp,
      recordsBackedUp: totalRecordsBackedUp,
      errors,
    };
  }

  /**
   * Backup table incrementally (only records modified since a date)
   */
  private async backupTableIncremental(
    tableName: string,
    sinceDate: Date,
    options: { batchSize?: number } = {},
  ): Promise<number> {
    if (!this.db) {
      console.warn("⚠️  Firebase backup not available - skipping incremental table backup");
      return 0;
    }

    const { batchSize = 100 } = options;
    let offset = 0;
    let hasMore = true;
    let totalRecords = 0;

    while (hasMore) {
      const rows = await sql`
        SELECT * FROM ${sql.unsafe(tableName)}
        WHERE updated_at >= ${sinceDate.toISOString()}
        ORDER BY updated_at DESC
        LIMIT ${batchSize} OFFSET ${offset}
      `;

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupCollection = collection(
        this.db,
        `incremental_backups/${timestamp}/${tableName}`,
      );

      const promises = rows.map(async (row, index) => {
        const docId = row.id?.toString() || `${offset + index}`;
        const docRef = doc(backupCollection, docId);
        const processedRow = this.processRowForFirebase(row);

        return setDoc(docRef, {
          ...processedRow,
          backup_timestamp: new Date().toISOString(),
          backup_type: "incremental",
          table_name: tableName,
        });
      });

      await Promise.all(promises);

      offset += batchSize;
      totalRecords += rows.length;
      hasMore = rows.length === batchSize;
    }

    return totalRecords;
  }

  /**
   * Process row data for Firebase compatibility
   */
  private processRowForFirebase(row: any): any {
    const processed = { ...row };

    // Convert dates to ISO strings
    for (const [key, value] of Object.entries(processed)) {
      if (value instanceof Date) {
        processed[key] = value.toISOString();
      } else if (typeof value === "object" && value !== null) {
        // Handle JSONB fields
        processed[key] = JSON.stringify(value);
      }
    }

    return processed;
  }

  /**
   * Schedule automatic backups
   */
  async scheduleBackups(): Promise<void> {
    // This would typically integrate with a job scheduler
    // For now, we'll just log the intention
    console.log("📅 Backup scheduling would be implemented here");
    console.log("Consider using node-cron or similar for production");
  }

  /**
   * Get backup status and statistics
   */
  async getBackupStatus(): Promise<{
    lastFullBackup?: string;
    lastIncrementalBackup?: string;
    totalBackups: number;
    firebaseConnected: boolean;
  }> {
    if (!this.db) {
      return {
        totalBackups: 0,
        firebaseConnected: false,
      };
    }

    try {
      // This is a simplified version - in production you'd track this metadata
      const healthCheck = await this.healthCheck();
      
      return {
        totalBackups: 0, // Would be tracked in metadata
        firebaseConnected: healthCheck.status === "healthy",
        lastFullBackup: undefined, // Would be tracked in metadata
        lastIncrementalBackup: undefined, // Would be tracked in metadata
      };
    } catch (error) {
      return {
        totalBackups: 0,
        firebaseConnected: false,
      };
    }
  }
}

export default FirebaseBackupService;