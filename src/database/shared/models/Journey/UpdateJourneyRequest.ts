export interface UpdateJourneyRequest {
  status?: "planned" | "active" | "completed" | "cancelled";
  started_at?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
  rating?: number;
  feedback?: string;
  metadata?: Record<string, any>;
}
