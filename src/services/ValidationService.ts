import { z } from "zod";
import { BaseService } from "./BaseService";

export class ValidationService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ ValidationService initialized");
  }

  validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation failed: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  async validateAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation failed: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  isValidEmail(email: string): boolean {
    const emailSchema = z.string().email();
    try {
      emailSchema.parse(email);
      return true;
    } catch {
      return false;
    }
  }

  isValidPhoneNumber(phone: string): boolean {
    const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);
    try {
      phoneSchema.parse(phone);
      return true;
    } catch {
      return false;
    }
  }

  async shutdown(): Promise<void> {
    console.log("🛑 ValidationService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return { status: "healthy" };
  }
}
