export interface CreateReviewRequest {
  user_id: string;
  reviewable_type: "rank" | "route" | "journey" | "taxi";
  reviewable_id: number;
  rating: number;
  title?: string;
  comment?: string;
  pros?: string;
  cons?: string;
  is_anonymous?: boolean;
}
