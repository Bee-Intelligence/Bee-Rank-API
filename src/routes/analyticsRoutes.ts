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

    // For now, return basic analytics - this method doesn't exist in AnalyticsService
    const analytics = {
      message: "Analytics endpoint not fully implemented yet",
      available_methods: ["trackEvent", "getUserMetrics", "getPopularRanks"]
    };

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
      eventType: event_type,
      userId: user_id || "anonymous",
      metadata: {
        ...metadata,
        sessionId: session_id,
        timestamp: new Date().toISOString(),
      },
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

    const userAnalytics = await analyticsService.getUserMetrics(userId);

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

    const popularRoutes = await analyticsService.getPopularRanks(
      Number.parseInt(limit as string)
    );

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
