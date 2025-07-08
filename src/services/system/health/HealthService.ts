// src/services/health/HealthService.ts
import { BaseService } from "../../core/base/BaseService";
import { sql } from "../../../config/db";
import { ServiceManager } from "../../core/manager/ServiceManager";
import os from "os";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  details: {
    database: boolean;
    cache: boolean;
    queue: boolean;
    system: {
      uptime: number;
      memory: {
        total: number;
        free: number;
        used: number;
      };
      cpu: {
        loadAvg: number[];
        cores: number;
      };
    };
  };
}

export class HealthService extends BaseService {
  private lastCheck: HealthStatus | null = null;
  private readonly CHECK_INTERVAL = 60000; // 1 minute

  constructor() {
    super("health");
    this.startHealthCheck();
  }

  private startHealthCheck() {
    setInterval(async () => {
      this.lastCheck = await this.checkHealth();

      // Log health status
      const loggingService = ServiceManager.getInstance().getService("logging");
      if (this.lastCheck.status !== "healthy" && loggingService && 'warn' in loggingService) {
        (loggingService as any).warn("System health degraded", this.lastCheck);
      }
    }, this.CHECK_INTERVAL);
  }

  async checkHealth(): Promise<HealthStatus> {
    const [dbHealth, cacheHealth, queueHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
      this.checkQueue(),
    ]);

    const systemHealth = this.checkSystem();

    const status = this.determineOverallStatus(
      dbHealth,
      cacheHealth,
      queueHealth,
    );

    return {
      status,
      timestamp: new Date().toISOString(),
      details: {
        database: dbHealth,
        cache: cacheHealth,
        queue: queueHealth,
        system: systemHealth,
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await sql`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkCache(): Promise<boolean> {
    try {
      const cacheService = ServiceManager.getInstance().getService("cache");
      if (cacheService && 'set' in cacheService && 'get' in cacheService) {
        await (cacheService as any).set("health_check", "ok", 10);
        const result = await (cacheService as any).get("health_check");
        return result === "ok";
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkQueue(): Promise<boolean> {
    try {
      const jobService = ServiceManager.getInstance().getService("job");
      if (jobService && 'getQueues' in jobService) {
        const queues = await (jobService as any).getQueues();
        return queues.every((queue: any) => queue.isReady());
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private checkSystem() {
    return {
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
      cpu: {
        loadAvg: os.loadavg(),
        cores: os.cpus().length,
      },
    };
  }

  private determineOverallStatus(
    dbHealth: boolean,
    cacheHealth: boolean,
    queueHealth: boolean,
  ): "healthy" | "degraded" | "unhealthy" {
    if (dbHealth && cacheHealth && queueHealth) {
      return "healthy";
    }
    if (!dbHealth) {
      return "unhealthy";
    }
    return "degraded";
  }

  getLastStatus(): HealthStatus | null {
    return this.lastCheck;
  }
}