import { z } from "zod";

export const insertTaxiRankSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().min(1),
  city: z.string().min(1),
  province: z.string().min(1),
  facilities: z
    .object({
      parking: z.boolean().optional(),
      security: z.boolean().optional(),
      toilets: z.boolean().optional(),
      food_vendors: z.boolean().optional(),
      shelter: z.boolean().optional(),
      atm: z.boolean().optional(),
      medical: z.boolean().optional(),
      shopping: z.boolean().optional(),
    })
    .optional(),
  fareRange: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  is_active: z.boolean().default(true),
});


export type InsertTaxiRank = z.infer<typeof insertTaxiRankSchema>;