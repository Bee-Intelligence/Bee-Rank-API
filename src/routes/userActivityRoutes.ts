import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import type { UserActivityService } from "../services";
import { ServiceManager } from "../services";
import type { CreateUserActivityRequest } from "../types/database.types";

const router = express.Router();

// Validation schema
const createUserActivitySchema = z.object({
  user_id: z.string().min(1),
  activity_type: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

const searchParamsSchema = z.object({
  user_id: z.string().optional(),
  activity_type: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

// Get user activities
router.get("/", async (req: Request, res: Response) => {
  try {
    const userActivityService =
      ServiceManager.getInstance().getService<UserActivityService>(
        "userActivity",
      );

    if (!userActivityService) {
      return res.status(503).json({
        success: false,
        message: "User activity service unavailable",
      });
    }

    const validatedParams = searchParamsSchema.parse(req.query);

    const searchParams = {
      user_id: validatedParams.user_id,
      activity_type: validatedParams.activity_type,
      start_date: validatedParams.start_date
        ? new Date(validatedParams.start_date)
        : undefined,
      end_date: validatedParams.end_date
        ? new Date(validatedParams.end_date)
        : undefined,
      limit: validatedParams.limit
        ? Number.parseInt(validatedParams.limit)
        : 50,
      offset: validatedParams.offset
        ? Number.parseInt(validatedParams.offset)
        : 0,
    };

    const { activities, total } =
      await userActivityService.getUserActivitiesWithParams(searchParams);

    res.json({
      success: true,
      data: activities,
      pagination: {
        total,
        limit: searchParams.limit,
        offset: searchParams.offset,
      },
    });
  } catch (error: any) {
    console.error("Error fetching user activities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user activities",
      error: error.message,
    });
  }
});

// Create user activity
router.post("/", async (req: Request, res: Response) => {
  try {
    const userActivityService =
      ServiceManager.getInstance().getService<UserActivityService>(
        "userActivity",
      );

    if (!userActivityService) {
      return res.status(503).json({
        success: false,
        message: "User activity service unavailable",
      });
    }

    const validatedData = createUserActivitySchema.parse({
      ...req.body,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get("User-Agent"),
    });

    const activity = await userActivityService.createUserActivity(
      validatedData as CreateUserActivityRequest,
    );

    res.status(201).json({
      success: true,
      data: activity,
      message: "User activity created successfully",
    });
  } catch (error: any) {
    console.error("Error creating user activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user activity",
      error: error.message,
    });
  }
});

// Get user activity by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userActivityService =
      ServiceManager.getInstance().getService<UserActivityService>(
        "userActivity",
      );

    if (!userActivityService) {
      return res.status(503).json({
        success: false,
        message: "User activity service unavailable",
      });
    }

    const { id } = req.params;
    const activity = await userActivityService.getUserActivityById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "User activity not found",
      });
    }

    res.json({
      success: true,
      data: activity,
    });
  } catch (error: any) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user activity",
      error: error.message,
    });
  }
});

// Delete user activity
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userActivityService =
      ServiceManager.getInstance().getService<UserActivityService>(
        "userActivity",
      );

    if (!userActivityService) {
      return res.status(503).json({
        success: false,
        message: "User activity service unavailable",
      });
    }

    const { id } = req.params;
    const userId = req.headers["user-id"] as string;

    const success = await userActivityService.deleteUserActivity(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "User activity not found or permission denied",
      });
    }

    res.json({
      success: true,
      message: "User activity deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user activity",
      error: error.message,
    });
  }
});

// Get user activity statistics
router.get("/stats/:userId", async (req: Request, res: Response) => {
  try {
    const userActivityService =
      ServiceManager.getInstance().getService<UserActivityService>(
        "userActivity",
      );

    if (!userActivityService) {
      return res.status(503).json({
        success: false,
        message: "User activity service unavailable",
      });
    }

    const { userId } = req.params;
    const { days = "30" } = req.query;

    const stats = await userActivityService.getUserActivityStats(
      userId,
      Number.parseInt(days as string),
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error fetching user activity stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user activity statistics",
      error: error.message,
    });
  }
});

// Track user action (simplified endpoint)
router.post("/track", async (req: Request, res: Response) => {
  try {
    const userActivityService =
      ServiceManager.getInstance().getService<UserActivityService>(
        "userActivity",
      );

    if (!userActivityService) {
      return res.status(503).json({
        success: false,
        message: "User activity service unavailable",
      });
    }

    const { user_id, action, details } = req.body;

    if (!user_id || !action) {
      return res.status(400).json({
        success: false,
        message: "user_id and action are required",
      });
    }

    const activity = await userActivityService.trackUserAction(
      user_id,
      action,
      details,
      req,
    );

    res.json({
      success: true,
      data: activity,
      message: "User action tracked successfully",
    });
  } catch (error: any) {
    console.error("Error tracking user action:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track user action",
      error: error.message,
    });
  }
});

export default router;
