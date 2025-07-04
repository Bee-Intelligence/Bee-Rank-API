import type { Response } from "express";
import type { ApiResponse, PaginatedResponse } from "../database/shared/models";

export class ResponseUtils {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    } as ApiResponse<T>);
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: Record<string, string[]>,
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  static paginated<T>(
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
      timestamp: new Date().toISOString(),
    } as PaginatedResponse<T>);
  }

  static notFound(res: Response, resource = "Resource"): Response {
    return ResponseUtils.error(res, `${resource} not found`, 404);
  }

  static badRequest(res: Response, message = "Bad request"): Response {
    return ResponseUtils.error(res, message, 400);
  }

  static unauthorized(res: Response, message = "Unauthorized"): Response {
    return ResponseUtils.error(res, message, 401);
  }

  static forbidden(res: Response, message = "Forbidden"): Response {
    return ResponseUtils.error(res, message, 403);
  }

  static conflict(
    res: Response,
    message = "Resource already exists",
  ): Response {
    return ResponseUtils.error(res, message, 409);
  }

  static serverError(
    res: Response,
    message = "Internal server error",
  ): Response {
    return ResponseUtils.error(res, message, 500);
  }

  static serviceUnavailable(
    res: Response,
    message = "Service unavailable",
  ): Response {
    return ResponseUtils.error(res, message, 503);
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    return ResponseUtils.success(res, data, message, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
