export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  comment?: string;
  pros?: string;
  cons?: string;
  is_flagged?: boolean;
  flagged_reason?: string;
  moderator_notes?: string;
}
