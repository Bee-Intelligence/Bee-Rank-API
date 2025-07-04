// src/storage/interfaces/IStorage.ts
import type {
  HikingSign,
  InsertHikingSign,
  InsertRoute,
  InsertTaxiRank,
  InsertUserActivity,
  Route,
  TaxiRank,
  UpsertUser,
  User,
  UserActivity,
} from "../../types/database.types.js";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserFirstTimeLaunch(id: string, isFirstTime: boolean): Promise<void>;

  // Taxi rank operations
  getTaxiRanks(): Promise<TaxiRank[]>;
  getTaxiRank(id: number): Promise<TaxiRank | undefined>;
  searchTaxiRanks(query: string): Promise<TaxiRank[]>;
  getNearbyTaxiRanks(
    latitude: number,
    longitude: number,
    radiusKm?: number,
  ): Promise<TaxiRank[]>;
  createTaxiRank(rank: InsertTaxiRank): Promise<TaxiRank>;

  // Route operations
  getRoutesByRank(rankId: number): Promise<Route[]>;
  createRoute(route: InsertRoute): Promise<Route>;

  // Hiking sign operations
  getHikingSigns(): Promise<HikingSign[]>;
  getHikingSignsByUser(userId: string): Promise<HikingSign[]>;
  createHikingSign(sign: InsertHikingSign): Promise<HikingSign>;

  // User activity operations
  getUserActivities(userId: string): Promise<UserActivity[]>;
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
}
