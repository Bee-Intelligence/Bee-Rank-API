import type { TimestampFields } from "../Common/TimestampFields";

export interface TransitRoute extends TimestampFields {
  id: number;
  user_id?: string;
  origin_rank_id: number;
  destination_rank_id: number;
  route_name?: string;
  from_location: string;
  to_location: string;
  fare: number;
  duration_minutes?: number;
  distance_km?: number;
  bus_line?: string;
  departure_time?: string;
  arrival_time?: string;
  route_type: "taxi" | "bus" | "mixed" | "walking";
  frequency_minutes: number;
  operating_days: number[];
  route_points: any[];
  metadata: Record<string, any>;
  is_direct: boolean;
  is_active: boolean;
}
