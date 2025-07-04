export interface TaxiRankSearchParams {
  name?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in meters
  is_active?: boolean;
  capacity_min?: number;
  capacity_max?: number;
  has_facilities?: string[];
  limit?: number;
  offset?: number;
  page?: number;
  per_page?: number;
}
