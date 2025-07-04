export interface RouteConnection {
  id: number;
  journey_id: string;
  route_id: number;
  sequence_order: number;
  connection_rank_id?: number;
  segment_fare?: number;
  segment_duration_minutes?: number;
  segment_distance_km?: number;
  waiting_time_minutes: number;
  created_at: Date;
}
