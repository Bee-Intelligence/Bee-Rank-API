import type { NextFunction, Request, Response } from "express";
import { BaseService } from "../../core/base/BaseService";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export class RateLimitService extends BaseService {
  private limiters: Map<string, any> = new Map();

  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ RateLimitService initialized");
  }

  createLimiter(key: string, options: RateLimitOptions) {
    const { windowMs, max, message = "Too many requests" } = options;

    // Simple in-memory rate limiter (for production, use Redis)
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || "unknown";
      const now = Date.now();

      const clientData = requests.get(clientId);

      if (!clientData || now > clientData.resetTime) {
        // Reset or initialize
        requests.set(clientId, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      if (clientData.count >= max) {
        return res.status(429).json({
          error: message,
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        });
      }

      clientData.count++;
      next();
    };
  }

  async shutdown(): Promise<void> {
    console.log("🛑 RateLimitService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return { status: "healthy" };
  }
}