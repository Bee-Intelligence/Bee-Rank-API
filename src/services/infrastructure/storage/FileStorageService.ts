import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface FileMetadata {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedBy?: string;
  uploadedAt: Date;
  category: string;
  isPublic: boolean;
  tags?: string[];
  expiresAt?: Date;
}

export interface UploadOptions {
  category: string;
  isPublic?: boolean;
  userId?: string;
  tags?: string[];
  expiresAt?: Date;
  maxSize?: number;
  allowedMimeTypes?: string[];
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  categoryCounts: Record<string, number>;
  publicFiles: number;
  privateFiles: number;
}

export class FileStorageService extends BaseService {
  private initialized = false;
  private baseStoragePath: string;
  private fileMetadata: Map<string, FileMetadata> = new Map();
  private maxFileSize = 50 * 1024 * 1024; // 50MB default
  private allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
  ];

  constructor() {
    super('FileStorageService');
    this.baseStoragePath = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
  }

  async init(): Promise<void> {
    console.log('Initializing FileStorageService');
    
    try {
      // Create storage directories
      await this.createStorageDirectories();
      
      // Load existing file metadata
      await this.loadFileMetadata();
      
      this.initialized = true;
      console.log('FileStorageService initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async createStorageDirectories(): Promise<void> {
    const directories = [
      this.baseStoragePath,
      path.join(this.baseStoragePath, 'public'),
      path.join(this.baseStoragePath, 'private'),
      path.join(this.baseStoragePath, 'temp'),
      path.join(this.baseStoragePath, 'uploads'),
      path.join(this.baseStoragePath, 'images'),
      path.join(this.baseStoragePath, 'documents'),
      path.join(this.baseStoragePath, 'videos'),
      path.join(this.baseStoragePath, 'audio'),
      path.join(this.baseStoragePath, 'hiking-signs'),
      path.join(this.baseStoragePath, 'user-avatars'),
      path.join(this.baseStoragePath, 'taxi-photos'),
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Created storage directory: ${dir}`);
      }
    }
  }

  private async loadFileMetadata(): Promise<void> {
    try {
      const metadataPath = path.join(this.baseStoragePath, 'metadata.json');
      
      try {
        const data = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(data);
        
        for (const [id, meta] of Object.entries(metadata)) {
          this.fileMetadata.set(id, {
            ...(meta as any),
            uploadedAt: new Date((meta as any).uploadedAt),
            expiresAt: (meta as any).expiresAt ? new Date((meta as any).expiresAt) : undefined,
          });
        }
        
        console.log(`Loaded metadata for ${this.fileMetadata.size} files`);
      } catch {
        // Metadata file doesn't exist, start fresh
        console.log('No existing metadata file found, starting fresh');
      }
    } catch (error) {
      console.warn('Error loading file metadata:', error);
    }
  }

  private async saveFileMetadata(): Promise<void> {
    try {
      const metadataPath = path.join(this.baseStoragePath, 'metadata.json');
      const metadata = Object.fromEntries(this.fileMetadata);
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Error saving file metadata:', error);
    }
  }

  private generateFileName(originalName: string, category: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    return `${category}_${timestamp}_${uuid}${ext}`;
  }

  private getStoragePath(category: string, isPublic: boolean): string {
    const visibility = isPublic ? 'public' : 'private';
    return path.join(this.baseStoragePath, visibility, category);
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    
    return hash.digest('hex');
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<FileMetadata> {
    try {
      // Validate file size
      if (options.maxSize && fileBuffer.length > options.maxSize) {
        throw new Error(`File size exceeds maximum allowed size of ${options.maxSize} bytes`);
      }
      
      if (fileBuffer.length > this.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
      }

      // Validate MIME type
      const allowedTypes = options.allowedMimeTypes || this.allowedMimeTypes;
      if (!allowedTypes.includes(mimeType)) {
        throw new Error(`File type ${mimeType} is not allowed`);
      }

      // Generate file metadata
      const fileId = uuidv4();
      const fileName = this.generateFileName(originalName, options.category);
      const storagePath = this.getStoragePath(options.category, options.isPublic || false);
      const filePath = path.join(storagePath, fileName);

      // Ensure storage directory exists
      await fs.mkdir(storagePath, { recursive: true });

      // Write file to disk
      await fs.writeFile(filePath, fileBuffer);

      // Calculate checksum
      const checksum = await this.calculateChecksum(filePath);

      // Create metadata
      const metadata: FileMetadata = {
        id: fileId,
        originalName,
        fileName,
        filePath,
        mimeType,
        size: fileBuffer.length,
        checksum,
        uploadedBy: options.userId,
        uploadedAt: new Date(),
        category: options.category,
        isPublic: options.isPublic || false,
        tags: options.tags,
        expiresAt: options.expiresAt,
      };

      // Store metadata
      this.fileMetadata.set(fileId, metadata);
      await this.saveFileMetadata();

      console.log('File uploaded successfully', { fileId, originalName, size: fileBuffer.length });
      return metadata;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async uploadFromStream(
    stream: NodeJS.ReadableStream,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<FileMetadata> {
    try {
      // Generate file metadata
      const fileId = uuidv4();
      const fileName = this.generateFileName(originalName, options.category);
      const storagePath = this.getStoragePath(options.category, options.isPublic || false);
      const filePath = path.join(storagePath, fileName);

      // Ensure storage directory exists
      await fs.mkdir(storagePath, { recursive: true });

      // Write stream to file
      const writeStream = createWriteStream(filePath);
      await pipeline(stream, writeStream);

      // Get file stats
      const stats = await fs.stat(filePath);

      // Validate file size
      if (options.maxSize && stats.size > options.maxSize) {
        await fs.unlink(filePath);
        throw new Error(`File size exceeds maximum allowed size of ${options.maxSize} bytes`);
      }

      if (stats.size > this.maxFileSize) {
        await fs.unlink(filePath);
        throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(filePath);

      // Create metadata
      const metadata: FileMetadata = {
        id: fileId,
        originalName,
        fileName,
        filePath,
        mimeType,
        size: stats.size,
        checksum,
        uploadedBy: options.userId,
        uploadedAt: new Date(),
        category: options.category,
        isPublic: options.isPublic || false,
        tags: options.tags,
        expiresAt: options.expiresAt,
      };

      // Store metadata
      this.fileMetadata.set(fileId, metadata);
      await this.saveFileMetadata();

      console.log('File uploaded from stream successfully', { fileId, originalName, size: stats.size });
      return metadata;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getFile(fileId: string): Promise<FileMetadata | null> {
    try {
      const metadata = this.fileMetadata.get(fileId);
      
      if (!metadata) {
        return null;
      }

      // Check if file has expired
      if (metadata.expiresAt && metadata.expiresAt < new Date()) {
        await this.deleteFile(fileId);
        return null;
      }

      // Verify file still exists on disk
      try {
        await fs.access(metadata.filePath);
        return metadata;
      } catch {
        // File doesn't exist on disk, remove from metadata
        this.fileMetadata.delete(fileId);
        await this.saveFileMetadata();
        return null;
      }
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  // Alias for getFile to match route expectations
  async getFileById(fileId: string): Promise<FileMetadata | null> {
    return this.getFile(fileId);
  }

  // Method to get files with search parameters (for routes)
  async getFiles(searchParams: {
    user_id?: string;
    file_type?: string;
    file_category?: string;
    is_public?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ files: FileMetadata[]; total: number }> {
    try {
      const options = {
        category: searchParams.file_category,
        userId: searchParams.user_id,
        isPublic: searchParams.is_public,
        limit: searchParams.limit,
        offset: searchParams.offset,
      };

      const files = await this.listFiles(options);
      
      // Get total count without pagination
      const allFiles = await this.listFiles({
        category: searchParams.file_category,
        userId: searchParams.user_id,
        isPublic: searchParams.is_public,
      });

      return {
        files,
        total: allFiles.length,
      };
    } catch (error) {
      this.handleError(error as Error);
      return { files: [], total: 0 };
    }
  }

  // Method to download file (for routes)
  async downloadFile(fileId: string): Promise<{
    file_name: string;
    file_type: string;
    file_data: Buffer;
  } | null> {
    try {
      const metadata = await this.getFile(fileId);
      if (!metadata) {
        return null;
      }

      const buffer = await this.getFileBuffer(fileId);
      if (!buffer) {
        return null;
      }

      return {
        file_name: metadata.originalName,
        file_type: metadata.mimeType,
        file_data: buffer,
      };
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  // Enhanced uploadFile method to handle route data format
  async uploadFileFromRoute(fileData: {
    user_id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_category: string;
    is_public: boolean;
    file_data: Buffer;
  }): Promise<FileMetadata> {
    const options = {
      category: fileData.file_category,
      isPublic: fileData.is_public,
      userId: fileData.user_id,
    };

    return this.uploadFile(
      fileData.file_data,
      fileData.file_name,
      fileData.file_type,
      options
    );
  }

  async getFileStream(fileId: string): Promise<NodeJS.ReadableStream | null> {
    try {
      const metadata = await this.getFile(fileId);
      
      if (!metadata) {
        return null;
      }

      return createReadStream(metadata.filePath);
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async getFileBuffer(fileId: string): Promise<Buffer | null> {
    try {
      const metadata = await this.getFile(fileId);
      
      if (!metadata) {
        return null;
      }

      return await fs.readFile(metadata.filePath);
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const metadata = this.fileMetadata.get(fileId);
      
      if (!metadata) {
        return false;
      }

      // Delete file from disk
      try {
        await fs.unlink(metadata.filePath);
      } catch (error) {
        console.warn('File not found on disk during deletion:', metadata.filePath);
      }

      // Remove from metadata
      this.fileMetadata.delete(fileId);
      await this.saveFileMetadata();

      console.log('File deleted successfully', { fileId, originalName: metadata.originalName });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async listFiles(options?: {
    category?: string;
    userId?: string;
    isPublic?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<FileMetadata[]> {
    try {
      let files = Array.from(this.fileMetadata.values());

      // Apply filters
      if (options?.category) {
        files = files.filter(f => f.category === options.category);
      }

      if (options?.userId) {
        files = files.filter(f => f.uploadedBy === options.userId);
      }

      if (options?.isPublic !== undefined) {
        files = files.filter(f => f.isPublic === options.isPublic);
      }

      if (options?.tags && options.tags.length > 0) {
        files = files.filter(f => 
          f.tags && options.tags!.some(tag => f.tags!.includes(tag))
        );
      }

      // Remove expired files
      const now = new Date();
      files = files.filter(f => !f.expiresAt || f.expiresAt > now);

      // Sort by upload date (newest first)
      files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      // Apply pagination
      if (options?.offset) {
        files = files.slice(options.offset);
      }

      if (options?.limit) {
        files = files.slice(0, options.limit);
      }

      return files;
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    try {
      const files = Array.from(this.fileMetadata.values());
      const now = new Date();
      const activeFiles = files.filter(f => !f.expiresAt || f.expiresAt > now);

      const stats: StorageStats = {
        totalFiles: activeFiles.length,
        totalSize: activeFiles.reduce((sum, f) => sum + f.size, 0),
        categoryCounts: {},
        publicFiles: activeFiles.filter(f => f.isPublic).length,
        privateFiles: activeFiles.filter(f => !f.isPublic).length,
      };

      // Count by category
      for (const file of activeFiles) {
        stats.categoryCounts[file.category] = (stats.categoryCounts[file.category] || 0) + 1;
      }

      return stats;
    } catch (error) {
      this.handleError(error as Error);
      return {
        totalFiles: 0,
        totalSize: 0,
        categoryCounts: {},
        publicFiles: 0,
        privateFiles: 0,
      };
    }
  }

  async cleanupExpiredFiles(): Promise<number> {
    try {
      const now = new Date();
      const expiredFiles = Array.from(this.fileMetadata.values())
        .filter(f => f.expiresAt && f.expiresAt < now);

      let deletedCount = 0;
      for (const file of expiredFiles) {
        const success = await this.deleteFile(file.id);
        if (success) {
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} expired files`);
      return deletedCount;
    } catch (error) {
      this.handleError(error as Error);
      return 0;
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const stats = await this.getStorageStats();
    
    return {
      status: 'healthy',
      details: {
        service: 'FileStorageService',
        initialized: this.initialized,
        baseStoragePath: this.baseStoragePath,
        stats,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down FileStorageService');
    
    // Save final metadata
    await this.saveFileMetadata();
    
    // Clear in-memory data
    this.fileMetadata.clear();
    this.initialized = false;
  }
}