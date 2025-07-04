// src/middleware/security.ts
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ServiceManager } from "../services/ServiceManager.js";

export const securityMiddleware = {
  // Basic security headers
  headers: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }),

  // Rate limiting
  rateLimit: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later",
  }),

  // API Key validation
  apiKey: (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || !isValidApiKey(apiKey as string)) {
      return res.status(401).json({
        error: "Invalid API key",
      });
    }

    next();
  },

  // Request validation
  validateRequest: (req: Request, res: Response, next: NextFunction) => {
    // Check content type
    if (req.method !== "GET" && !req.is("application/json")) {
      return res.status(415).json({
        error: "Content-Type must be application/json",
      });
    }

    // Check request size
    if (
      req.headers["content-length"] &&
      Number.parseInt(req.headers["content-length"]) > 1e6
    ) {
      return res.status(413).json({
        error: "Request entity too large",
      });
    }

    next();
  },
};

function isValidApiKey(apiKey: string): boolean {
  // Implement API key validation logic
  return true; // Placeholder
}
