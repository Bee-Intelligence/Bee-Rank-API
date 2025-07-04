export interface ApiRateLimit {
  id: number;
  user_id: string;
  endpoint: string;
  request_count: number;
  window_start: Date;
  created_at: Date;
}
