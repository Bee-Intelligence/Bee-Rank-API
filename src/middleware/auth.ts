// src/middleware/auth.ts
import type { NextFunction, Request, Response } from "express";
import { ServiceManager } from "../services";
import type { AuthService } from "../services";
import { createAppError } from "./errorHandling.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next(createAppError("No token provided", 401));
    }

    const token = authHeader.split(" ")[1];
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");

    if (!authService) {
      return next(createAppError("Authentication service unavailable", 503));
    }

    const payload = await authService.verifyToken(token);

    // Convert payload to match req.user type
    req.user = {
      id: payload.userId,
      email: payload.email,
      roles: [payload.role]
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createAppError("Not authenticated", 401));
    }

    const hasRole = req.user.roles.some((role) => roles.includes(role));
    if (!hasRole) {
      return next(createAppError("Not authorized", 403));
    }

    next();
  };
};
