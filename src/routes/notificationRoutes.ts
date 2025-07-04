import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { ServiceManager } from "../services";
import type { NotificationService } from "../services";

const router = express.Router();

// Validation schemas
const createNotificationSchema = z.object({
  user_id: z.string(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["info", "warning", "error", "success"]),
  category: z.string().optional(),
  action_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  scheduled_for: z.string().datetime().optional(),
});

// Get notifications for user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["user-id"] as string;
    const { is_read, type, category, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID required",
      });
    }

    const notificationService =
      ServiceManager.getInstance().getService<NotificationService>(
        "notification",
      );

    if (!notificationService) {
      return res.status(503).json({
        success: false,
        message: "Notification service unavailable",
      });
    }

    const searchParams = {
      user_id: userId,
      is_read: is_read === "true",
      type: type as string,
      category: category as string,
      limit: Number.parseInt(limit as string),
      offset:
        (Number.parseInt(page as string) - 1) *
        Number.parseInt(limit as string),
    };

    const { notifications, total } =
      await notificationService.getNotifications(searchParams);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: Number.parseInt(page as string),
        limit: Number.parseInt(limit as string),
        total_pages: Math.ceil(total / Number.parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch notifications",
    });
  }
});

// Create notification
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = createNotificationSchema.parse(req.body);

    const notificationService =
      ServiceManager.getInstance().getService<NotificationService>(
        "notification",
      );

    if (!notificationService) {
      return res.status(503).json({
        success: false,
        message: "Notification service unavailable",
      });
    }

    const notification =
      await notificationService.createNotification(validatedData);

    res.status(201).json({
      success: true,
      data: notification,
      message: "Notification created successfully",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error("Create notification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create notification",
    });
  }
});

// Mark notification as read
router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers["user-id"] as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID required",
      });
    }

    const notificationService =
      ServiceManager.getInstance().getService<NotificationService>(
        "notification",
      );

    if (!notificationService) {
      return res.status(503).json({
        success: false,
        message: "Notification service unavailable",
      });
    }

    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      data: notification,
      message: "Notification marked as read",
    });
  } catch (error: any) {
    console.error("Mark notification read error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark notification as read",
    });
  }
});

// Mark all notifications as read
router.patch("/read-all", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["user-id"] as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID required",
      });
    }

    const notificationService =
      ServiceManager.getInstance().getService<NotificationService>(
        "notification",
      );

    if (!notificationService) {
      return res.status(503).json({
        success: false,
        message: "Notification service unavailable",
      });
    }

    const count = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      data: { updated_count: count },
      message: "All notifications marked as read",
    });
  } catch (error: any) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark all notifications as read",
    });
  }
});

// Delete notification
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers["user-id"] as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID required",
      });
    }

    const notificationService =
      ServiceManager.getInstance().getService<NotificationService>(
        "notification",
      );

    if (!notificationService) {
      return res.status(503).json({
        success: false,
        message: "Notification service unavailable",
      });
    }

    const success = await notificationService.deleteNotification(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete notification",
    });
  }
});

// Get notification counts
router.get("/counts", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["user-id"] as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID required",
      });
    }

    const notificationService =
      ServiceManager.getInstance().getService<NotificationService>(
        "notification",
      );

    if (!notificationService) {
      return res.status(503).json({
        success: false,
        message: "Notification service unavailable",
      });
    }

    const counts = await notificationService.getNotificationCounts(userId);

    res.json({
      success: true,
      data: counts,
    });
  } catch (error: any) {
    console.error("Get notification counts error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch notification counts",
    });
  }
});

// Send push notification
router.post("/push", async (req: Request, res: Response) => {
  try {
    const { user_ids, title, message, data } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const notificationService =
      ServiceManager.getInstance().getService<NotificationService>(
        "notification",
      );

    if (!notificationService) {
      return res.status(503).json({
        success: false,
        message: "Notification service unavailable",
      });
    }

    const results = await notificationService.sendPushNotification({
      user_ids,
      title,
      message,
      data: data || {},
    });

    res.json({
      success: true,
      data: results,
      message: "Push notification sent",
    });
  } catch (error: any) {
    console.error("Send push notification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send push notification",
    });
  }
});

export default router;
