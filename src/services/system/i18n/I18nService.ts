import { BaseService } from "../../core/base/BaseService";

export class I18nService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ I18nService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 I18nService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return { status: "healthy" };
  }
}