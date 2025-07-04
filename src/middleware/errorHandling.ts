import type { NextFunction, Request, Response } from "express";
import { ServiceManager } from "../services";
import type { AnalyticsService } from "../services";

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

class AppErrorClass extends Error implements AppError {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createAppError = (
  message: string,
  statusCode: number,
): AppError => {
  return new AppErrorClass(message, statusCode);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = async (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log error details
  console.error("Error Details:", {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Track error in analytics
  try {
    const analyticsService =
      ServiceManager.getInstance().getService<AnalyticsService>("analytics");
    if (analyticsService) {
      // Use a constant UUID for anonymous users
      const ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000";

      await analyticsService.trackEvent({
        event_type: "error",
        user_id: (req as any).user?.id || ANONYMOUS_USER_ID, // Use constant UUID for anonymous users
        metadata: {
          error_message: err.message,
          error_code: err.statusCode,
          url: req.url,
          method: req.method,
          user_agent: req.get("User-Agent"),
          ip: req.ip,
        },
        session_id: (req as any).sessionId || req.get("Session-ID"),
        timestamp: new Date(),
      });
    }
  } catch (analyticsError) {
    console.error("Failed to track error in analytics:", analyticsError);
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === "production") {
    if (err.isOperational) {
      // Operational errors: send error details
      return res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
      });
    } else {
      // Programming errors: don't leak error details
      return res.status(500).json({
        success: false,
        status: "error",
        message: "Something went wrong!",
      });
    }
  }

  // Development environment: send full error details
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const err = createAppError(
    `Can't find ${req.originalUrl} on this server!`,
    404,
  );
  next(err);
};

// Validation error handler
export const validationErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((val: any) => val.message);
    const message = `Invalid input data. ${errors.join(". ")}`;
    const validationError = createAppError(message, 400);
    return next(validationError);
  }

  if (err.name === "ZodError") {
    const errors = err.errors.map(
      (error: any) => `${error.path.join(".")}: ${error.message}`,
    );
    const message = `Validation failed. ${errors.join(". ")}`;
    const validationError = createAppError(message, 400);
    return next(validationError);
  }

  next(err);
};

// Database error handler
export const databaseErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err.code === "23505") {
    // Unique violation
    const message = "Duplicate field value entered";
    const dbError = createAppError(message, 400);
    return next(dbError);
  }

  if (err.code === "23503") {
    // Foreign key violation
    const message = "Invalid reference to related data";
    const dbError = createAppError(message, 400);
    return next(dbError);
  }

  if (err.code === "23502") {
    // Not null violation
    const message = "Required field is missing";
    const dbError = createAppError(message, 400);
    return next(dbError);
  }

  next(err);
};

// Rate limit error handler
export const rateLimitErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err.status === 429) {
    const message = "Too many requests from this IP, please try again later";
    const rateLimitError = createAppError(message, 429);
    return next(rateLimitError);
  }

  next(err);
};

// JWT error handler
export const jwtErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token. Please log in again";
    const jwtError = createAppError(message, 401);
    return next(jwtError);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Your token has expired. Please log in again";
    const jwtError = createAppError(message, 401);
    return next(jwtError);
  }

  next(err);
};

export default {
  createAppError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  validationErrorHandler,
  databaseErrorHandler,
  rateLimitErrorHandler,
  jwtErrorHandler,
};
