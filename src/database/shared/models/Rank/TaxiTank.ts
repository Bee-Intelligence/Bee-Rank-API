import type { TimestampFields } from "../Common/TimestampFields";

export interface TaxiRank extends TimestampFields {
  id: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  province: string;
  capacity: number;
  facilities: Record<string, any>;
  operating_hours: Record<string, string>;
  contact_number?: string;
  accessibility_features: any[];
  fare_structure: Record<string, any>;
  safety_rating: number;
  popularity_score: number;
  routes: any[];
  distance?: number;
  is_active: boolean;
}
