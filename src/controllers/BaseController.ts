import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from "../database/shared/models";

export abstract class BaseController {
  protected handleError(
    error: any,
    res: Response,
    defaultMessage = "An error occurred",
  ) {
    console.error("Controller Error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.reduce(
          (acc, err) => {
            const path = err.path.join(".");
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>,
        ),
      });
    }

    if (error.code === "23505") {
      // PostgreSQL unique violation
      return res.status(409).json({
        success: false,
        message: "Resource already exists",
      });
    }

    if (error.code === "23503") {
      // PostgreSQL foreign key violation
      return res.status(400).json({
        success: false,
        message: "Invalid reference to related resource",
      });
    }

    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || defaultMessage;

    return res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }

  protected successResponse<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
    } as ApiResponse<T>);
  }

  protected paginatedResponse<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    per_page: number,
    message?: string,
  ): Response {
    const total_pages = Math.ceil(total / per_page);

    return res.json({
      success: true,
      data,
      message,
      pagination: {
        total,
        page,
        per_page,
        total_pages,
        has_next: page < total_pages,
        has_previous: page > 1,
      },
    } as PaginatedResponse<T>);
  }

  protected getPaginationParams(req: Request): PaginationParams {
    const page = Math.max(1, Number.parseInt(req.query.page as string) || 1);
    const per_page = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.per_page as string) || 20),
    );
    const offset = (page - 1) * per_page;

    return { page, per_page, limit: per_page, offset };
  }

  protected validateId(id: string): number {
    const numId = Number.parseInt(id);
    if (isNaN(numId) || numId <= 0) {
      throw new Error("Invalid ID format");
    }
    return numId;
  }

  protected validateUUID(id: string): string {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid UUID format");
    }
    return id;
  }

  protected extractUserId(req: Request): string {
    // TODO: Extract from JWT token when auth is implemented
    return (req.headers["x-user-id"] as string) || "demo-user";
  }

  protected asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}
