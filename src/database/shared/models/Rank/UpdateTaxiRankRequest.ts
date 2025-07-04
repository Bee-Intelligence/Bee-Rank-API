export interface UpdateTaxiRankRequest {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  province?: string;
  capacity?: number;
  facilities?: Record<string, any>;
  operating_hours?: Record<string, string>;
  safety_rating?: number;
  popularity_score?: number;
  is_active?: boolean;
}
