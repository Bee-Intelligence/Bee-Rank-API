import { sql } from "../config/db";

export abstract class BaseService {
  protected serviceName: string;

  protected constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // Simple query execution with error handling
  protected async executeQuery<T>(query: () => Promise<T>): Promise<T> {
    try {
      return await query();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  protected handleError(error: Error): void {
    console.error(`[${this.serviceName}] Error:`, error.message);
    // Add more error handling logic as needed
  }

  // Abstract methods that concrete services should implement
  abstract initialize(): Promise<void>;
  abstract shutdown(): Promise<void>;
  abstract healthCheck(): Promise<{ status: string; details?: any }>;
}
