export interface CreateReviewVoteRequest {
  review_id: number;
  user_id: string;
  vote_type: "helpful" | "not_helpful";
}
