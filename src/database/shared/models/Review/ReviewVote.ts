export interface ReviewVote {
  id: number;
  review_id: number;
  user_id: string;
  vote_type: "helpful" | "not_helpful";
  created_at: Date;
}
