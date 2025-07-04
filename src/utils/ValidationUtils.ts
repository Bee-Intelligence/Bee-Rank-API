import { z } from "zod";

export class ValidationUtils {
  static readonly emailSchema = z.string().email();
  static readonly phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);
  static readonly uuidSchema = z.string().uuid();
  static readonly coordinateSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  });

  static validateEmail(email: string): boolean {
    try {
      ValidationUtils.emailSchema.parse(email);
      return true;
    } catch {
      return false;
    }
  }

  static validatePhone(phone: string): boolean {
    try {
      ValidationUtils.phoneSchema.parse(phone);
      return true;
    } catch {
      return false;
    }
  }

  static validateUUID(uuid: string): boolean {
    try {
      ValidationUtils.uuidSchema.parse(uuid);
      return true;
    } catch {
      return false;
    }
  }

  static validateCoordinates(lat: number, lng: number): boolean {
    try {
      ValidationUtils.coordinateSchema.parse({ latitude: lat, longitude: lng });
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, "");
  }

  static validatePagination(
    page?: string,
    limit?: string,
  ): { page: number; limit: number; offset: number } {
    const parsedPage = Math.max(1, Number.parseInt(page || "1"));
    const parsedLimit = Math.min(
      100,
      Math.max(1, Number.parseInt(limit || "20")),
    );
    const offset = (parsedPage - 1) * parsedLimit;

    return { page: parsedPage, limit: parsedLimit, offset };
  }

  static validateDateRange(
    startDate?: string,
    endDate?: string,
  ): { startDate?: Date; endDate?: Date } {
    const result: { startDate?: Date; endDate?: Date } = {};

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        result.startDate = start;
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        result.endDate = end;
      }
    }

    if (
      result.startDate &&
      result.endDate &&
      result.startDate > result.endDate
    ) {
      throw new Error("Start date cannot be after end date");
    }

    return result;
  }
}
