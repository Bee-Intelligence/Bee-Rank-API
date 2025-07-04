export interface ReviewSearchParams {
  user_id?: string;
  reviewable_type?: "rank" | "route" | "journey" | "taxi";
  reviewable_id?: number;
  rating?: number;
  is_flagged?: boolean;
  limit?: number;
  offset?: number;
}
