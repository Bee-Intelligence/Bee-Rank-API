export interface CreateApiRateLimitRequest {
  user_id: string;
  endpoint: string;
  request_count?: number;
  window_start?: Date;
}
