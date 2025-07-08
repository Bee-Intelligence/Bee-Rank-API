// src/services/error-tracking/ErrorTrackingService.ts
import { BaseService } from "../../core/base/BaseService";
import { ServiceManager } from "../../core/manager/ServiceManager";
import { sql } from "../../../config/db";

interface ErrorReport {
  error: Error;
  context: {
    userId?: string;
    requestId?: string;
    path?: string;
    method?: string;
    timestamp: string;
    environment: string;
  };
  metadata?: Record<string, any>;
}

export class ErrorTrackingService extends BaseService {
  private readonly errorBuffer: ErrorReport[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    super("errorTracking");
    this.setupPeriodicFlush();
  }

  private setupPeriodicFlush() {
    setInterval(() => {
      this.flushErrors().catch(console.error);
    }, this.FLUSH_INTERVAL);
  }

  async trackError(report: ErrorReport) {
    this.errorBuffer.push(report);

    if (this.errorBuffer.length >= this.BUFFER_SIZE) {
      await this.flushErrors();
    }

    // Notify relevant services
    const eventService = ServiceManager.getInstance().getService("event");
    if (eventService && 'emit' in eventService) {
      await (eventService as any).emit(
        "error:detected",
        {
          message: report.error.message,
          context: report.context,
        },
        { persist: true },
      );
    }
  }

  private async flushErrors() {
    if (this.errorBuffer.length === 0) return;

    const errors = [...this.errorBuffer];
    this.errorBuffer.length = 0;

    await this.executeTransaction(async () => {
      for (const report of errors) {
        await sql`
          INSERT INTO error_reports (
            error_message,
            error_stack,
            context,
            metadata,
            created_at
          ) VALUES (
            ${report.error.message},
            ${report.error.stack},
            ${JSON.stringify(report.context)},
            ${report.metadata ? JSON.stringify(report.metadata) : null},
            ${report.context.timestamp}
          )
        `;
      }
    });
  }

  async getErrorStats(
    options: {
      from?: Date;
      to?: Date;
      groupBy?: "hour" | "day" | "week";
    } = {},
  ) {
    const { from, to, groupBy = "day" } = options;

    return await this.executeTransaction(async () => {
      return await sql`
        SELECT 
          DATE_TRUNC(${groupBy}, created_at) as period,
          COUNT(*) as count,
          COUNT(DISTINCT context->>'userId') as affected_users
        FROM error_reports
        WHERE 
          ${from ? sql`created_at >= ${from}` : sql`1=1`}
          AND ${to ? sql`created_at <= ${to}` : sql`1=1`}
        GROUP BY period
        ORDER BY period DESC
      `;
    });
  }
}