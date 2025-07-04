import { z } from "zod";

// Schema for query parameters in getAll method
export const journeyQuerySchema = z.object({
  user_id: z.string().optional(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
  journey_type: z.enum(["direct", "connected", "no_route_found"]).optional(),
  date_from: z.string().optional(), // Will be parsed to Date
  date_to: z.string().optional(), // Will be parsed to Date
  page: z.string().optional(), // Will be parsed to number
  per_page: z.string().optional(), // Will be parsed to number
});

// Schema for query parameters in getUserJourneys method
export const userJourneysQuerySchema = z.object({
  status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
  page: z.string().optional(), // Will be parsed to number
  per_page: z.string().optional(), // Will be parsed to number
});

// Schema for query parameters in getJourneyStats method
export const journeyStatsQuerySchema = z.object({
  date_from: z.string().optional(), // Will be parsed to Date
  date_to: z.string().optional(), // Will be parsed to Date
});

export type JourneyQuery = z.infer<typeof journeyQuerySchema>;
export type UserJourneysQuery = z.infer<typeof userJourneysQuerySchema>;
export type JourneyStatsQuery = z.infer<typeof journeyStatsQuerySchema>;