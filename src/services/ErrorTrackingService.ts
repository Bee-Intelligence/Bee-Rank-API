import { BaseService } from "./BaseService";

export class ErrorTrackingService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ ErrorTrackingService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 ErrorTrackingService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return { status: "healthy" };
  }
}
