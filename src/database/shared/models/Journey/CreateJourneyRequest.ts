export interface CreateJourneyRequest {
  user_id: string;
  origin_rank_id: number;
  destination_rank_id: number;
  total_fare: number;
  total_duration_minutes?: number;
  total_distance_km?: number;
  hop_count?: number;
  route_path?: number[];
  waypoints?: any[];
  journey_type?: "direct" | "connected" | "no_route_found";
}
