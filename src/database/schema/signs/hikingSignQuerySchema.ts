import {z} from "zod";

export const hikingSignQuerySchema = z.object({
    userId: z.string().optional(),
    latitude: z
        .string()
        .transform((val) => Number.parseFloat(val))
        .optional(),
    longitude: z
        .string()
        .transform((val) => Number.parseFloat(val))
        .optional(),
    radius: z
        .string()
        .transform((val) => Number.parseFloat(val))
        .default("5000"),
    isVerified: z
        .string()
        .transform((val) => val === "true")
        .optional(),
    page: z
        .string()
        .transform((val) => Number.parseInt(val))
        .default("1"),
    limit: z
        .string()
        .transform((val) => Number.parseInt(val))
        .default("20"),
});

export type HikingSignQuery = z.infer<typeof hikingSignQuerySchema>;