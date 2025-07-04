import { sql } from "../config/db";
import { BaseService } from "./BaseService";

interface FileData {
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  is_public: boolean;
  file_data: Buffer;
}

interface FileSearchParams {
  user_id?: string;
  file_type?: string;
  file_category?: string;
  is_public?: boolean;
  limit?: number;
  offset?: number;
}

interface FileRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  is_public: boolean;
  file_url: string;
  created_at: Date;
  updated_at: Date;
}

interface FileDownload {
  file_name: string;
  file_type: string;
  file_data: Buffer;
}

export class FileStorageService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ FileStorageService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 FileStorageService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const [result] = await sql`SELECT 1 as health_check`;
      return { status: "healthy", details: { database: "connected" } };
    } catch (error: any) {
      return {
        status: "unhealthy",
        details: { error: error?.message || "Unknown error" },
      };
    }
  }

  async uploadFile(fileData: FileData): Promise<FileRecord> {
    return this.executeQuery(async () => {
      const fileId = this.generateFileId();
      const fileUrl = this.generateFileUrl(fileId, fileData.file_name);

      const [file] = await sql`
        INSERT INTO files (
          id, user_id, file_name, file_type, file_size, 
          file_category, is_public, file_url, file_data, 
          created_at, updated_at
        )
        VALUES (
          ${fileId}, ${fileData.user_id}, ${fileData.file_name},
          ${fileData.file_type}, ${fileData.file_size}, ${fileData.file_category},
          ${fileData.is_public}, ${fileUrl}, ${fileData.file_data},
          NOW(), NOW()
        )
        RETURNING id, user_id, file_name, file_type, file_size, 
                 file_category, is_public, file_url, created_at, updated_at
      `;

      return file as FileRecord;
    });
  }

  async getFiles(
    params: FileSearchParams,
  ): Promise<{ files: FileRecord[]; total: number }> {
    return this.executeQuery(async () => {
      const {
        user_id,
        file_type,
        file_category,
        is_public,
        limit = 20,
        offset = 0,
      } = params;

      const whereConditions = ["1=1"];

      if (user_id) {
        whereConditions.push(`user_id = '${user_id}'`);
      }

      if (file_type) {
        whereConditions.push(`file_type = '${file_type}'`);
      }

      if (file_category) {
        whereConditions.push(`file_category = '${file_category}'`);
      }

      if (is_public !== undefined) {
        whereConditions.push(`is_public = ${is_public}`);
      }

      const whereClause = whereConditions.join(" AND ");

      const files = await sql`
        SELECT id, user_id, file_name, file_type, file_size, 
               file_category, is_public, file_url, created_at, updated_at
        FROM files
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM files
        WHERE ${sql.unsafe(whereClause)}
      `;

      return { files: files as FileRecord[], total: Number.parseInt(count) };
    });
  }

  async getFileById(id: string): Promise<FileRecord | null> {
    return this.executeQuery(async () => {
      const [file] = await sql`
        SELECT id, user_id, file_name, file_type, file_size, 
               file_category, is_public, file_url, created_at, updated_at
        FROM files
        WHERE id = ${id}
      `;

      return (file as FileRecord) || null;
    });
  }

  async downloadFile(id: string): Promise<FileDownload | null> {
    return this.executeQuery(async () => {
      const [file] = await sql`
        SELECT file_name, file_type, file_data
        FROM files
        WHERE id = ${id}
      `;

      return (file as FileDownload) || null;
    });
  }

  async deleteFile(id: string, userId?: string): Promise<boolean> {
    return this.executeQuery(async () => {
      let whereClause = `id = '${id}'`;

      if (userId) {
        whereClause += ` AND user_id = '${userId}'`;
      }

      const [result] = await sql`
        DELETE FROM files
        WHERE ${sql.unsafe(whereClause)}
        RETURNING id
      `;

      return !!result;
    });
  }

  async updateFileMetadata(
    id: string,
    updateData: Partial<FileData>,
  ): Promise<FileRecord | null> {
    return this.executeQuery(async () => {
      const updateFields = Object.keys(updateData)
        .filter(
          (key) =>
            updateData[key as keyof FileData] !== undefined &&
            key !== "file_data",
        )
        .map((key) => `${key} = '${updateData[key as keyof FileData]}'`)
        .join(", ");

      if (!updateFields) {
        throw new Error("No fields to update");
      }

      const [file] = await sql`
        UPDATE files
        SET ${sql.unsafe(updateFields)}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, user_id, file_name, file_type, file_size, 
                 file_category, is_public, file_url, created_at, updated_at
      `;

      return (file as FileRecord) || null;
    });
  }

  async getUserFileStats(userId: string): Promise<any> {
    return this.executeQuery(async () => {
      const stats = await sql`
        SELECT 
          COUNT(*) as total_files,
          SUM(file_size) as total_size,
          COUNT(CASE WHEN is_public = true THEN 1 END) as public_files,
          COUNT(CASE WHEN is_public = false THEN 1 END) as private_files
        FROM files
        WHERE user_id = ${userId}
      `;

      const categoryStats = await sql`
        SELECT 
          file_category,
          COUNT(*) as count,
          SUM(file_size) as total_size
        FROM files
        WHERE user_id = ${userId}
        GROUP BY file_category
        ORDER BY count DESC
      `;

      return {
        ...stats[0],
        categories: categoryStats,
      };
    });
  }

  private generateFileId(): string {
    return "file_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  private generateFileUrl(fileId: string, fileName: string): string {
    return `/api/files/${fileId}/download`;
  }

  async getFilesByCategory(
    category: string,
    limit = 20,
  ): Promise<FileRecord[]> {
    return this.executeQuery(async () => {
      const files = await sql`
        SELECT id, user_id, file_name, file_type, file_size, 
               file_category, is_public, file_url, created_at, updated_at
        FROM files
        WHERE file_category = ${category} AND is_public = true
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return files as FileRecord[];
    });
  }

  async searchFiles(query: string, userId?: string): Promise<FileRecord[]> {
    return this.executeQuery(async () => {
      let whereClause = `file_name ILIKE '%${query}%'`;

      if (userId) {
        whereClause += ` AND (user_id = '${userId}' OR is_public = true)`;
      } else {
        whereClause += ` AND is_public = true`;
      }

      const files = await sql`
        SELECT id, user_id, file_name, file_type, file_size, 
               file_category, is_public, file_url, created_at, updated_at
        FROM files
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY created_at DESC
        LIMIT 50
      `;

      return files as FileRecord[];
    });
  }
}
