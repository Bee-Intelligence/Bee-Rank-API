import type { TimestampFields } from "../Common/TimestampFields";

export interface Review extends TimestampFields {
  id: number;
  user_id: string;
  reviewable_type: "rank" | "route" | "journey" | "taxi";
  reviewable_id: number;
  rating: number;
  title?: string;
  comment?: string;
  pros?: string;
  cons?: string;
  helpful_count: number;
  is_verified_purchase: boolean;
  is_anonymous: boolean;
  is_flagged: boolean;
  flagged_reason?: string;
  moderator_notes?: string;
}
