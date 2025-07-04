import {z} from "zod";

export const createTaxiRankSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().min(5, "Address must be at least 5 characters"),
    city: z.string().min(2, "City must be at least 2 characters"),
    province: z.string().min(2, "Province must be at least 2 characters"),
    capacity: z.number().positive().optional(),
    operating_hours: z.object({
        open: z
            .string()
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
        close: z
            .string()
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
    }),
    facilities: z.record(z.any()),
    status: z.enum(["active", "inactive", "under_maintenance"]),
    // Add missing fields required by CreateTaxiRankRequest
    fare_structure: z.record(z.any()).default({}),
    accessibility_features: z.array(z.never()).default([]),
    is_active: z.boolean().default(true),
    contact_number: z.number(),
});
export type CreateTaxiRank = z.infer<typeof createTaxiRankSchema>;
