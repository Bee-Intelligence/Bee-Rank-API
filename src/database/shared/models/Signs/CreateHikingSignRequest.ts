export interface CreateHikingSignRequest {
  user_id?: string;
  image_url: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  from_location?: string;
  to_location?: string;
  fare_amount?: number;
  sign_type?: string;
}
