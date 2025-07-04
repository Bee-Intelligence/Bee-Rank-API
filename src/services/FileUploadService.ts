import { createWriteStream } from "fs";
import { join } from "path";
import { extname } from "path";
import { mkdir, stat, unlink } from "fs/promises";
import { pipeline } from "stream/promises";
import { sql } from "../config/db";
import { BaseService } from "./BaseService";

interface UploadOptions {
  allowedTypes?: string[];
  maxSize?: number;
  storage?: "local" | "cloud";
  processImage?: {
    resize?: { width: number; height: number };
    format?: string;
    quality?: number;
  };
}

interface UploadResult {
  id: string;
  filename: string;
  file_type: string;
  size: number;
  mime_type: string;
  url: string;
  is_public: boolean;
  created_at: Date;
}

export class FileUploadService extends BaseService {
  private readonly uploadDir: string;
  private readonly bucketName: string;

  constructor(serviceName: string) {
    super(serviceName);
    this.uploadDir = join(process.cwd(), "uploads");
    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET || "beerank-uploads";
    this.ensureUploadDir();
  }

  async initialize(): Promise<void> {
    await this.ensureUploadDir();
    console.log("✅ FileUploadService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 FileUploadService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      await stat(this.uploadDir);
      return {
        status: "healthy",
        details: { uploadDir: this.uploadDir, accessible: true },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        status: "unhealthy",
        details: {
          uploadDir: this.uploadDir,
          accessible: false,
          error: errorMessage,
        },
      };
    }
  }

  private async ensureUploadDir() {
    try {
      await stat(this.uploadDir);
    } catch {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: any, // Using any instead of Express.Multer.Files for now
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    await this.validateFile(file, options);

    const fileId = this.generateFileId();
    const extension = extname(file.originalname);
    const filename = `${fileId}${extension}`;

    let processedFile = file;
    if (options.processImage && this.isImage(file.mimetype)) {
      processedFile = await this.processImage(file, options.processImage);
    }

    const uploadResult = await this.uploadToLocal(processedFile, filename);

    const result = await this.saveFileRecord({
      id: fileId,
      filename: file.originalname,
      path: uploadResult.path,
      size: uploadResult.size,
      mimeType: file.mimetype,
      storage: options.storage || "local",
      metadata: uploadResult.metadata,
    });

    return result;
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async validateFile(file: any, options: UploadOptions) {
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} not allowed`);
    }

    if (options.maxSize && file.size > options.maxSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${options.maxSize} bytes`,
      );
    }
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith("image/");
  }

  private async processImage(
    file: any,
    options: UploadOptions["processImage"],
  ): Promise<any> {
    // Simplified image processing without sharp dependency
    // In a real implementation, you would use sharp or another image processing library
    console.log("Image processing requested but not implemented");
    return file;
  }

  private async uploadToLocal(
    file: any,
    filename: string,
  ): Promise<{ path: string; size: number; metadata: Record<string, any> }> {
    const filePath = join(this.uploadDir, filename);

    // For buffer-based files
    if (file.buffer) {
      const writeStream = createWriteStream(filePath);
      await pipeline(Buffer.from(file.buffer), writeStream);
    } else {
      throw new Error("Files buffer not available");
    }

    const stats = await stat(filePath);

    return {
      path: filePath,
      size: stats.size,
      metadata: {
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
      },
    };
  }

  private async saveFileRecord(
    fileData: Record<string, any>,
  ): Promise<UploadResult> {
    return this.executeQuery(async () => {
      const [result] = await sql`
        INSERT INTO files (
          id,
          filename,
          file_type,
          size,
          mime_type,
          url,
          is_public,
          created_at
        ) VALUES (
                   ${fileData.id},
                   ${fileData.filename},
                   ${fileData.mimeType?.split("/")[0] || "unknown"},
                   ${fileData.size},
                   ${fileData.mimeType},
                   ${fileData.path},
                   ${false},
                   NOW()
                 )
          RETURNING *
      `;
      return result as UploadResult;
    });
  }

  async getFile(fileId: string): Promise<UploadResult> {
    return this.executeQuery(async () => {
      const [file] = await sql`
        SELECT * FROM files WHERE id = ${fileId}
      `;

      if (!file) {
        throw new Error(`File with id ${fileId} not found`);
      }

      return file as UploadResult;
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.getFile(fileId);

    // Delete physical file
    try {
      await unlink(file.url); // Using url field as file path
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(`Could not delete physical file: ${errorMessage}`);
    }

    // Delete database record
    await this.executeQuery(async () => {
      await sql`DELETE FROM files WHERE id = ${fileId}`;
    });
  }

  async getUserFiles(userId: string, limit = 10): Promise<UploadResult[]> {
    return this.executeQuery(async () => {
      const files = await sql`
        SELECT * FROM files 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      return files as UploadResult[];
    });
  }

  async getFilesByType(fileType: string, limit = 10): Promise<UploadResult[]> {
    return this.executeQuery(async () => {
      const files = await sql`
        SELECT * FROM files 
        WHERE file_type = ${fileType}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      return files as UploadResult[];
    });
  }
}
