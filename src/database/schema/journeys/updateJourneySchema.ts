import { z } from "zod";

export const updateJourneySchema = z.object({
  status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
  cancellation_reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateJourney = z.infer<typeof updateJourneySchema>;

// Schema for updating just the status
export const updateJourneyStatusSchema = z.object({
  status: z.enum(["planned", "active", "completed", "cancelled"]),
});

export type UpdateJourneyStatus = z.infer<typeof updateJourneyStatusSchema>;