import {z} from "zod";

export const insertHikingSignSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    imageUrl: z.string().url("Valid image URL is required"),
    description: z.string().optional(),
    latitude: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
    longitude: z
        .number()
        .min(-180)
        .max(180, "Longitude must be between -180 and 180"),
    address: z.string().optional(),
    fromLocation: z.string().optional(),
    toLocation: z.string().optional(),
    fareAmount: z.number().positive().optional(),
    signType: z.string().default("fare_board"),
});

export type InsertHikingSign = z.infer<typeof insertHikingSignSchema>;