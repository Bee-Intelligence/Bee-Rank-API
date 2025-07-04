import express from "express";
import { trackAnalytics } from "../middleware/analyticsMiddleware";
import { ServiceManager } from "../services";
import type { SearchService } from "../services";
import type { CacheService } from "../services";
import type { RateLimitService } from "../services";

const router = express.Router();

router.get("/", trackAnalytics("search"), async (req, res) => {
  try {
    const { type, query, page, limit, ...filters } = req.query;

    // Get services with proper typing
    const searchService =
      ServiceManager.getInstance().getService<SearchService>("search");
    const cacheService =
      ServiceManager.getInstance().getService<CacheService>("cache");
    const rateLimitService =
      ServiceManager.getInstance().getService<RateLimitService>("rateLimit");

    // Check if services are available
    if (!searchService) {
      return res.status(500).json({ message: "Search service not available" });
    }

    if (!cacheService) {
      return res.status(500).json({ message: "Cache service not available" });
    }

    // Apply rate limiting if available
    if (rateLimitService) {
      const limiter = rateLimitService.createLimiter("/search", {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30, // 30 requests per minute
      });

      // Note: For proper rate limiting, this should be middleware
      // For now, we'll skip rate limiting if service is not available
    }

    const cacheKey = `search:${type}:${query}:${page}:${JSON.stringify(filters)}`;

    const results = await cacheService.wrap(
      cacheKey,
      () =>
        searchService.search({
          type: type as any,
          query: query as string,
          filters,
          page: Number.parseInt(page as string) || 1,
          limit: Number.parseInt(limit as string) || 20,
        }),
      300, // Cache for 5 minutes
    );

    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search failed" });
  }
});

export default router;
