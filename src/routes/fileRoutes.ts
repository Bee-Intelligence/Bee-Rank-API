import express from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { ServiceManager } from "../services";
import type { FileStorageService } from "../services";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Upload file
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file provided",
        });
      }

      const { file_category, is_public = false } = req.body;
      const userId = (req.headers["user-id"] as string) || "anonymous";

      const fileStorageService =
        ServiceManager.getInstance().getService<FileStorageService>(
          "fileStorage",
        );

      if (!fileStorageService) {
        return res.status(503).json({
          success: false,
          message: "File storage service unavailable",
        });
      }

      const fileData = {
        user_id: userId,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        file_category: file_category || "general",
        is_public: is_public === "true",
        file_data: req.file.buffer,
      };

      const uploadedFile = await fileStorageService.uploadFile(fileData);

      res.json({
        success: true,
        data: uploadedFile,
        message: "File uploaded successfully",
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload file",
      });
    }
  },
);

// Get files
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      file_type,
      file_category,
      is_public,
      page = 1,
      limit = 20,
    } = req.query;

    const fileStorageService =
      ServiceManager.getInstance().getService<FileStorageService>(
        "fileStorage",
      );

    if (!fileStorageService) {
      return res.status(503).json({
        success: false,
        message: "File storage service unavailable",
      });
    }

    const searchParams = {
      user_id: user_id as string,
      file_type: file_type as string,
      file_category: file_category as string,
      is_public: is_public === "true",
      limit: Number.parseInt(limit as string),
      offset:
        (Number.parseInt(page as string) - 1) *
        Number.parseInt(limit as string),
    };

    const { files, total } = await fileStorageService.getFiles(searchParams);

    res.json({
      success: true,
      data: files,
      pagination: {
        total,
        page: Number.parseInt(page as string),
        limit: Number.parseInt(limit as string),
        total_pages: Math.ceil(total / Number.parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error("Get files error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch files",
    });
  }
});

// Get file by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const fileStorageService =
      ServiceManager.getInstance().getService<FileStorageService>(
        "fileStorage",
      );

    if (!fileStorageService) {
      return res.status(503).json({
        success: false,
        message: "File storage service unavailable",
      });
    }

    const file = await fileStorageService.getFileById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error: any) {
    console.error("Get file error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch file",
    });
  }
});

// Download file
router.get("/:id/download", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const fileStorageService =
      ServiceManager.getInstance().getService<FileStorageService>(
        "fileStorage",
      );

    if (!fileStorageService) {
      return res.status(503).json({
        success: false,
        message: "File storage service unavailable",
      });
    }

    const fileData = await fileStorageService.downloadFile(id);

    if (!fileData) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.setHeader("Content-Type", fileData.file_type);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileData.file_name}"`,
    );
    res.send(fileData.file_data);
  } catch (error: any) {
    console.error("Download file error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to download file",
    });
  }
});

// Delete file
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers["user-id"] as string;

    const fileStorageService =
      ServiceManager.getInstance().getService<FileStorageService>(
        "fileStorage",
      );

    if (!fileStorageService) {
      return res.status(503).json({
        success: false,
        message: "File storage service unavailable",
      });
    }

    const success = await fileStorageService.deleteFile(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "File not found or permission denied",
      });
    }

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete file error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete file",
    });
  }
});

export default router;
