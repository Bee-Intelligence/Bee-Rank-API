import type { TimestampFields } from "../Common/TimestampFields";

export interface Journey extends TimestampFields {
  id: number;
  journey_id: string;
  user_id: string;
  origin_rank_id?: number;
  destination_rank_id?: number;
  total_fare: number;
  total_duration_minutes?: number;
  total_distance_km?: number;
  hop_count: number;
  route_path?: number[];
  waypoints: any[];
  journey_type: "direct" | "connected" | "no_route_found";
  status: "planned" | "active" | "completed" | "cancelled";
  started_at?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
  rating?: number;
  feedback?: string;
  metadata: Record<string, any>;
}
