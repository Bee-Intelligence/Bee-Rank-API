import type { NextFunction, Request, Response } from "express";
import { ServiceManager } from "../services";
import type { AnalyticsService } from "../services";

export function trackAnalytics(eventType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceManager = ServiceManager.getInstance();
      const analyticsService =
        serviceManager.getService<AnalyticsService>("analytics");

      if (
        analyticsService &&
        typeof analyticsService.trackEvent === "function"
      ) {
        await analyticsService.trackEvent({
          event_type: eventType,
          user_id: (req as any).user?.id || "anonymous",
          metadata: {
            path: req.path,
            method: req.method,
            query: req.query,
            userAgent: req.get("User-Agent"),
            ip: req.ip,
          },
          session_id: (req as any).sessionId || req.get("Session-ID"),
          timestamp: new Date(),
        });
      }
    } catch (error) {
      // Don't break the request flow if analytics fails
      console.error("Analytics tracking error:", error);
    }

    next();
  };
}

// Additional middleware for tracking specific user actions
export function trackUserAction(action: string) {
  return trackAnalytics(`user_${action}`);
}

// Middleware for tracking API endpoint usage
export function trackApiUsage() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceManager = ServiceManager.getInstance();
      const analyticsService =
        serviceManager.getService<AnalyticsService>("analytics");

      if (
        analyticsService &&
        typeof analyticsService.trackEvent === "function"
      ) {
        await analyticsService.trackEvent({
          event_type: "api_usage",
          user_id: (req as any).user?.id || "anonymous",
          metadata: {
            endpoint: req.originalUrl,
            method: req.method,
            status_code: res.statusCode,
            response_time: Date.now() - (req as any).startTime,
            user_agent: req.get("User-Agent"),
            ip: req.ip,
            body_size: JSON.stringify(req.body || {}).length,
            query_params: Object.keys(req.query || {}).length,
          },
          session_id: (req as any).sessionId || req.get("Session-ID"),
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("API usage tracking error:", error);
    }

    next();
  };
}

// Middleware for tracking page views (for web interface)
export function trackPageView() {
  return trackAnalytics("page_view");
}

// Middleware for tracking search queries
export function trackSearch() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceManager = ServiceManager.getInstance();
      const analyticsService =
        serviceManager.getService<AnalyticsService>("analytics");

      if (
        analyticsService &&
        typeof analyticsService.trackEvent === "function"
      ) {
        const { query, filters, location } = req.query;

        await analyticsService.trackEvent({
          event_type: "search",
          user_id: (req as any).user?.id || "anonymous",
          metadata: {
            search_query: query,
            filters: filters,
            location: location,
            path: req.path,
            method: req.method,
            user_agent: req.get("User-Agent"),
            ip: req.ip,
          },
          session_id: (req as any).sessionId || req.get("Session-ID"),
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Search tracking error:", error);
    }

    next();
  };
}

// Middleware for tracking errors
export function trackError() {
  return async (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const serviceManager = ServiceManager.getInstance();
      const analyticsService =
        serviceManager.getService<AnalyticsService>("analytics");

      if (
        analyticsService &&
        typeof analyticsService.trackEvent === "function"
      ) {
        await analyticsService.trackEvent({
          event_type: "error",
          user_id: (req as any).user?.id || "anonymous",
          metadata: {
            error_message: err.message,
            error_stack: err.stack,
            path: req.path,
            method: req.method,
            status_code: res.statusCode,
            user_agent: req.get("User-Agent"),
            ip: req.ip,
          },
          session_id: (req as any).sessionId || req.get("Session-ID"),
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Error tracking error:", error);
    }

    next(err);
  };
}

// Middleware for adding start time to requests (for response time tracking)
export function addRequestTiming() {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).startTime = Date.now();
    next();
  };
}

export default {
  trackAnalytics,
  trackUserAction,
  trackApiUsage,
  trackPageView,
  trackSearch,
  trackError,
  addRequestTiming,
};
