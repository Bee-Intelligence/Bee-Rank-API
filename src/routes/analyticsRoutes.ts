import express from "express";
import type { Request, Response } from "express";
import { ServiceManager } from "../services";
import type { AnalyticsService } from "../services";

const router = express.Router();

// Get analytics data
router.get("/", async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, metric_type, user_id } = req.query;

    const analyticsService =
      ServiceManager.getInstance().getService<AnalyticsService>("analytics");

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        message: "Analytics service unavailable",
      });
    }

    const analytics = await analyticsService.getAnalytics({
      start_date: start_date ? new Date(start_date as string) : undefined,
      end_date: end_date ? new Date(end_date as string) : undefined,
      metric_type: metric_type as string,
      user_id: user_id as string,
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error("Analytics route error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch analytics",
    });
  }
});

// Track event
router.post("/events", async (req: Request, res: Response) => {
  try {
    const { event_type, user_id, metadata, session_id } = req.body;

    if (!event_type) {
      return res.status(400).json({
        success: false,
        message: "Event type is required",
      });
    }

    const analyticsService =
      ServiceManager.getInstance().getService<AnalyticsService>("analytics");

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        message: "Analytics service unavailable",
      });
    }

    await analyticsService.trackEvent({
      event_type,
      user_id: user_id || "anonymous",
      metadata: metadata || {},
      session_id,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: "Event tracked successfully",
    });
  } catch (error: any) {
    console.error("Event tracking error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to track event",
    });
  }
});

// Get user analytics
router.get("/users/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { start_date, end_date } = req.query;

    const analyticsService =
      ServiceManager.getInstance().getService<AnalyticsService>("analytics");

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        message: "Analytics service unavailable",
      });
    }

    const userAnalytics = await analyticsService.getUserAnalytics(userId, {
      start_date: start_date ? new Date(start_date as string) : undefined,
      end_date: end_date ? new Date(end_date as string) : undefined,
    });

    res.json({
      success: true,
      data: userAnalytics,
    });
  } catch (error: any) {
    console.error("User analytics error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user analytics",
    });
  }
});

// Get popular routes
router.get("/popular-routes", async (req: Request, res: Response) => {
  try {
    const { limit = 10, period = "7d" } = req.query;

    const analyticsService =
      ServiceManager.getInstance().getService<AnalyticsService>("analytics");

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        message: "Analytics service unavailable",
      });
    }

    const popularRoutes = await analyticsService.getPopularRoutes({
      limit: Number.parseInt(limit as string),
      period: period as string,
    });

    res.json({
      success: true,
      data: popularRoutes,
    });
  } catch (error: any) {
    console.error("Popular routes error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch popular routes",
    });
  }
});

export default router;
