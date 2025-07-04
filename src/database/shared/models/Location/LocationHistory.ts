export interface LocationHistory {
  id: number;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  activity_type?: string;
  battery_level?: number;
  is_mock_location: boolean;
  recorded_at: Date;
  created_at: Date;
}
