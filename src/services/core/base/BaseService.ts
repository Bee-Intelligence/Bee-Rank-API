// src/services/base/BaseService.ts
import { IBaseService } from "../../interfaces/IBaseService";
import { sql } from "../../../config/db";

export abstract class BaseService implements IBaseService {
  constructor(serviceName: string) {
    
  }

  protected async executeTransaction<T>(
    operation: (tx: any) => Promise<T>,
  ): Promise<T> {
    try {
      const result = await operation(sql);
      return result;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  protected async executeQuery<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async init(): Promise<void> {
    // Implementation specific to each service
  }

  async initialize(): Promise<void> {
    await this.init();
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return {
      status: 'healthy',
      details: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    // Implementation specific to each service
  }

  handleError(error: Error): void {
    console.error(`Service error: ${error.message}`);
    // Add error logging/monitoring here
  }
}