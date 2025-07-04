import { BaseService } from "./BaseService";

export class EmailService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ EmailService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 EmailService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return { status: "healthy" };
  }
}
