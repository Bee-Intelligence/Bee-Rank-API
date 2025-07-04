export interface UserActivity {
  id: number;
  user_id: string;
  activity_type: string;
  entity_type?: string;
  entity_id?: number;
  rank_id?: number;
  sign_id?: number;
  route_id?: number;
  journey_id?: string;
  session_id?: string;
  latitude?: number;
  longitude?: number;
  metadata: Record<string, any>;
  created_at: Date;
}
