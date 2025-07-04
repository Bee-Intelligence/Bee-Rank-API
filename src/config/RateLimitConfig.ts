import type { NextFunction, Request, Response } from "express";
import { ResponseUtils } from "../utils/ResponseUtils";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      windowMs: config.windowMs || 60000, // 1 minute
      max: config.max || 60, // 60 requests per minute
      message: config.message || "Too many requests from this IP, please try again later",
      keyGenerator: config.keyGenerator || ((req) => req.ip || "unknown"),
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = this.config.keyGenerator!(req);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 1,
        resetTime,
      };
      return next();
    }

    this.store[key].count++;

    if (this.store[key].count > this.config.max) {
      const timeLeft = Math.ceil((this.store[key].resetTime - now) / 1000);
      res.set({
        "X-RateLimit-Limit": this.config.max.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": Math.ceil(
          this.store[key].resetTime / 1000,
        ).toString(),
        "Retry-After": timeLeft.toString(),
      });

      return ResponseUtils.error(res, this.config.message!, 429);
    }

    res.set({
      "X-RateLimit-Limit": this.config.max.toString(),
      "X-RateLimit-Remaining": (
        this.config.max - this.store[key].count
      ).toString(),
      "X-RateLimit-Reset": Math.ceil(
        this.store[key].resetTime / 1000,
      ).toString(),
    });

    next();
  };

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }
}

export const createRateLimit = (config: RateLimitConfig) => {
  const limiter = new RateLimiter(config);
  return limiter.middleware;
};

// Predefined rate limiters
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: "Too many authentication attempts, please try again later",
});

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: "Too many API requests, please try again later",
});

export const searchRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: "Too many search requests, please try again later",
});

export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: "Too many upload requests, please try again later",
});
