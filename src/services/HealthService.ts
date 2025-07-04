import { BaseService } from "./BaseService";

export class HealthService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ HealthService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 HealthService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return { status: "healthy" };
  }
}
