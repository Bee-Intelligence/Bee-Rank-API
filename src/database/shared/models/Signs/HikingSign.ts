import type { TimestampFields } from "../Common/TimestampFields";

export interface HikingSign extends TimestampFields {
  id: number;
  user_id?: string;
  image_url: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  from_location?: string;
  to_location?: string;
  fare_amount?: number;
  sign_type: string;
  last_updated_by?: string;
  verification_count: number;
  is_verified: boolean;
  verification_date?: Date;
}
