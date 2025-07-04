import { z } from "zod";

export const createTransitRouteSchema = z.object({
  origin_rank_id: z.number().positive(),
  destination_rank_id: z.number().positive(),
  route_name: z.string().optional(),
  from_location: z.string().min(1),
  to_location: z.string().min(1),
  fare: z.number().positive(),
  duration_minutes: z.number().positive().optional(),
  distance_km: z.number().positive().optional(),
  route_type: z.enum(["taxi", "bus", "mixed", "walking"]).optional(),
  is_direct: z.boolean().optional(),
  frequency_minutes: z.number().positive().optional(),
  operating_days: z.array(z.number().min(1).max(7)).optional(),
});
export type createTransitRoute = z.infer<typeof createTransitRouteSchema>;