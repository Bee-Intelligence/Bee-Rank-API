// src/types/database.types.ts
import type {
  HikingSign as HikingSignModel,
  TaxiRank as TaxiRankModel,
  TransitRoute as TransitRouteModel,
  User as UserModel,
  UserActivity as UserActivityModel,
} from "../database/shared/models";

// Define types based on the imported models
export type UpsertUser = Omit<UserModel, 'id' | 'created_at' | 'updated_at'>;
export type User = UserModel;

export type InsertTaxiRank = Omit<TaxiRankModel, 'id' | 'created_at' | 'updated_at'>;
export type TaxiRank = TaxiRankModel;

export type InsertRoute = Omit<TransitRouteModel, 'id' | 'created_at' | 'updated_at'>;
export type Route = TransitRouteModel;

export type InsertHikingSign = Omit<HikingSignModel, 'id' | 'created_at' | 'updated_at'>;
export type HikingSign = HikingSignModel;

export type InsertUserActivity = Omit<UserActivityModel, 'id' | 'created_at' | 'updated_at'>;
export type UserActivity = UserActivityModel;

// Additional type definitions for consistency
export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  profile_image_url?: string;
  role?: "USER" | "ADMIN" | "OPERATOR";
  user_name?: string;
  phone_number?: number;
  is_first_time_launch?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image_url?: string;
  role?: "USER" | "ADMIN" | "OPERATOR";
  user_name?: string;
  phone_number?: number;
  is_first_time_launch?: boolean;
  password_hash?: string;
}

export interface UserSearchParams {
  search?: string;
  role?: "USER" | "ADMIN" | "OPERATOR";
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface CreateUserActivityRequest {
  user_id: string;
  activity_type: string;
  description?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface UserActivitySearchParams {
  user_id?: string;
  activity_type?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

// Journey related types
export interface Journey {
  id: string;
  user_id: string;
  origin_rank_id: number;
  destination_rank_id: number;
  route_path: number[];
  total_fare: number;
  total_distance_km?: number;
  total_duration_minutes?: number;
  status: "planning" | "active" | "completed" | "cancelled";
  start_time?: Date;
  end_time?: Date;
  actual_fare?: number;
  notes?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateJourneyRequest {
  user_id: string;
  origin_rank_id: number;
  destination_rank_id: number;
  route_path: number[];
  total_fare: number;
  total_distance_km?: number;
  total_duration_minutes?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface JourneySearchParams {
  user_id?: string;
  status?: string;
  origin_rank_id?: number;
  destination_rank_id?: number;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}
