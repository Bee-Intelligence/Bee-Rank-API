export interface CreateTaxiNearbyRequest {
  route_id?: number;
  from_location?: string;
  to_location?: string;
  image_url: string;
  description?: string;
  fare?: number;
  operating_hours?: string;
  current_latitude?: number;
  current_longitude?: number;
}
