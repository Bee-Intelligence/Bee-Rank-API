import { BaseService } from "./BaseService";

export class LoggingService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ LoggingService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 LoggingService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return { status: "healthy" };
  }
}
