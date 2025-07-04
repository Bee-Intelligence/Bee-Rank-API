import { join } from "path";
import { writeFile } from "fs/promises";
import { sql } from "../config/db";
import { BaseService } from "./BaseService";

interface ExportOptions {
  entity: string;
  filters?: Record<string, any>;
  format: "csv" | "json" | "excel";
  filename?: string;
  outputPath?: string;
}

interface ExportResult {
  success: boolean;
  filePath?: string;
  recordCount?: number;
  error?: string;
}

export class DataExportService extends BaseService {
  private readonly defaultOutputPath: string;

  constructor(serviceName: string) {
    super(serviceName);
    this.defaultOutputPath = join(process.cwd(), "exports");
  }

  async initialize(): Promise<void> {
    // Ensure exports directory exists
    try {
      const fs = await import("fs");
      if (!fs.existsSync(this.defaultOutputPath)) {
        fs.mkdirSync(this.defaultOutputPath, { recursive: true });
      }
      console.log("✅ DataExportService initialized");
    } catch (error) {
      console.error("Failed to initialize DataExportService:", error);
    }
  }

  async shutdown(): Promise<void> {
    console.log("🛑 DataExportService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const fs = await import("fs");
      const outputPathExists = fs.existsSync(this.defaultOutputPath);

      // Test database connection
      await sql`SELECT 1`;

      return {
        status: "healthy",
        details: {
          outputPath: this.defaultOutputPath,
          outputPathExists,
          database: "connected",
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        status: "unhealthy",
        details: { error: errorMessage },
      };
    }
  }

  async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      // Fetch data from database
      const data = await this.fetchData(options.entity, options.filters);

      if (!data || data.length === 0) {
        return {
          success: false,
          error: "No data found to export",
        };
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename =
        options.filename || `${options.entity}_export_${timestamp}`;
      const outputPath = options.outputPath || this.defaultOutputPath;

      let filePath: string;

      // Export based on format
      switch (options.format) {
        case "csv":
          filePath = await this.exportToCsv(data, filename, outputPath);
          break;
        case "json":
          filePath = await this.exportToJson(data, filename, outputPath);
          break;
        case "excel":
          filePath = await this.exportToExcel(data, filename, outputPath);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      return {
        success: true,
        filePath,
        recordCount: data.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async fetchData(
    entity: string,
    filters?: Record<string, any>,
  ): Promise<any[]> {
    return this.executeQuery(async () => {
      // Simple table name validation
      const allowedTables = ["users", "drivers", "ranks", "routes", "journeys"];
      if (!allowedTables.includes(entity)) {
        throw new Error(`Invalid entity: ${entity}`);
      }

      let queryResult: any[];

      // Always fetch all data first, then filter in memory for simplicity
      // In a production system, you'd want to do filtering at the database level
      switch (entity) {
        case "users":
          queryResult = await sql`SELECT * FROM users`;
          break;
        case "drivers":
          queryResult = await sql`SELECT * FROM drivers`;
          break;
        case "ranks":
          queryResult = await sql`SELECT * FROM ranks`;
          break;
        case "routes":
          queryResult = await sql`SELECT * FROM routes`;
          break;
        case "journeys":
          queryResult = await sql`SELECT * FROM journeys`;
          break;
        default:
          throw new Error(`Unsupported entity: ${entity}`);
      }

      // Apply filters in memory if provided
      if (filters && Object.keys(filters).length > 0) {
        queryResult = queryResult.filter((row) => {
          return Object.entries(filters).every(([key, value]) => {
            // Validate column name before comparing
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
              return false; // Skip invalid column names
            }
            return row[key] === value;
          });
        });
      }

      return Array.isArray(queryResult) ? queryResult : [];
    });
  }

  private async fetchDataWithFilters(
    entity: string,
    filters: Record<string, any>,
  ): Promise<any[]> {
    // This method demonstrates how you might handle specific filter cases
    // For now, it's simplified but shows the pattern for safe database queries

    return this.executeQuery(async () => {
      let queryResult: any[];

      // Handle specific common filter cases safely
      if (entity === "users" && filters.id) {
        queryResult = await sql`SELECT * FROM users WHERE id = ${filters.id}`;
      } else if (entity === "users" && filters.email) {
        queryResult =
          await sql`SELECT * FROM users WHERE email = ${filters.email}`;
      } else if (entity === "drivers" && filters.user_id) {
        queryResult =
          await sql`SELECT * FROM drivers WHERE user_id = ${filters.user_id}`;
      } else if (entity === "ranks" && filters.name) {
        queryResult =
          await sql`SELECT * FROM ranks WHERE name = ${filters.name}`;
      } else if (entity === "routes" && filters.rank_id) {
        queryResult =
          await sql`SELECT * FROM routes WHERE rank_id = ${filters.rank_id}`;
      } else if (entity === "journeys" && filters.driver_id) {
        queryResult =
          await sql`SELECT * FROM journeys WHERE driver_id = ${filters.driver_id}`;
      } else {
        // Fallback: fetch all and filter in memory
        queryResult = await this.fetchData(entity);
        if (filters) {
          queryResult = queryResult.filter((row) => {
            return Object.entries(filters).every(
              ([key, value]) => row[key] === value,
            );
          });
        }
      }

      return Array.isArray(queryResult) ? queryResult : [];
    });
  }

  private async exportToCsv(
    data: any[],
    filename: string,
    outputPath: string,
  ): Promise<string> {
    const filePath = join(outputPath, `${filename}.csv`);

    if (data.length === 0) {
      await writeFile(filePath, "No data to export");
      return filePath;
    }

    // Simple CSV generation
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");

    const csvRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = row[header];
          // Handle null/undefined values and escape quotes
          if (value === null || value === undefined) {
            return "";
          }
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",");
    });

    const csv = [csvHeaders, ...csvRows].join("\n");
    await writeFile(filePath, csv);
    return filePath;
  }

  private async exportToJson(
    data: any[],
    filename: string,
    outputPath: string,
  ): Promise<string> {
    const filePath = join(outputPath, `${filename}.json`);
    await writeFile(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  private async exportToExcel(
    data: any[],
    filename: string,
    outputPath: string,
  ): Promise<string> {
    // Simple Excel-like format using CSV with .xlsx extension
    // In a real implementation, you would use a proper Excel library
    const filePath = join(outputPath, `${filename}.xlsx`);

    if (data.length === 0) {
      await writeFile(filePath, "No data to export");
      return filePath;
    }

    // For now, just export as CSV with Excel extension
    // This will open in Excel but won't have true Excel formatting
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join("\t"); // Use tabs for better Excel compatibility

    const csvRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) {
            return "";
          }
          return String(value);
        })
        .join("\t");
    });

    const tsvContent = [csvHeaders, ...csvRows].join("\n");
    await writeFile(filePath, tsvContent);
    return filePath;
  }

  async getExportHistory(): Promise<any[]> {
    // In a real implementation, you might store export history in the database
    return [];
  }

  async cleanupOldExports(olderThanDays = 30): Promise<number> {
    try {
      const fs = await import("fs");
      const files = fs.readdirSync(this.defaultOutputPath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      for (const file of files) {
        const filePath = join(this.defaultOutputPath, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up old exports:", error);
      return 0;
    }
  }

  // Utility method to get available tables for export
  async getAvailableTables(): Promise<string[]> {
    try {
      const result = await this.executeQuery(async () => {
        return await sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
        `;
      });

      return Array.isArray(result)
        ? result.map((row: any) => row.table_name)
        : [];
    } catch (error) {
      console.error("Error fetching available tables:", error);
      return ["users", "drivers", "ranks", "routes", "journeys"]; // fallback list
    }
  }

  // Utility method for bulk export
  async exportMultipleTables(
    tables: string[],
    format: "csv" | "json" | "excel" = "json",
    outputPath?: string,
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const table of tables) {
      const result = await this.exportData({
        entity: table,
        format,
        outputPath,
      });
      results.push(result);
    }

    return results;
  }
}
