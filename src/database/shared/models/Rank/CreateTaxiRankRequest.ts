export interface CreateTaxiRankRequest {
  fare_structure: {};
  accessibility_features: never[];
  is_active: boolean;
  contact_number: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  province: string;
  capacity?: number;
  facilities?: Record<string, any>;
  operating_hours?: Record<string, string>;
}
