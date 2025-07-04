export interface RouteSearchParams {
  origin_rank_id?: number;
  destination_rank_id?: number;
  route_type?: "taxi" | "bus" | "mixed" | "walking";
  fare_min?: number;
  fare_max?: number;
  duration_max?: number;
  distance_max?: number;
  is_direct?: boolean;
  user_id?: string;
  limit?: number;
  offset?: number;
  page?: number;
  per_page?: number;
}
