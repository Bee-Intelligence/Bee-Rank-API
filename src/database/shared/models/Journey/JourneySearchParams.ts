export interface JourneySearchParams {
  user_id?: string;
  status?: "planned" | "active" | "completed" | "cancelled";
  journey_type?: "direct" | "connected" | "no_route_found";
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}
