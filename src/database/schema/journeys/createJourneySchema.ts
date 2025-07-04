import { z } from "zod";

export const createJourneySchema = z.object({
  origin_rank_id: z.number().positive(),
  destination_rank_id: z.number().positive(),
  total_fare: z.number().positive(),
  total_duration_minutes: z.number().positive().optional(),
  total_distance_km: z.number().positive().optional(),
  hop_count: z.number().positive().optional(),
  route_path: z.array(z.number()).optional(),
  waypoints: z.array(z.any()).optional(),
  journey_type: z.enum(["direct", "connected", "no_route_found"]).optional(),
});

export type CreateJourney = z.infer<typeof createJourneySchema>;