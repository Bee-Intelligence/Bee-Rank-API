import {z} from "zod";

export const createRouteSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    startRankId: z.number().positive(),
    endRankId: z.number().positive(),
    distance: z.number().positive(),
    estimatedDuration: z.number().positive(),
    fare: z.number().positive(),
    waypoints: z
        .array(
            z.object({
                latitude: z.number().min(-90).max(90),
                longitude: z.number().min(-180).max(180),
                name: z.string().optional(),
            }),
        )
        .optional(),
    schedule: z.array(
        z.object({
            day: z.enum([
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ]),
            departureTimes: z.array(
                z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
            ),
        }),
    ),
});

export type CreateRoute = z.infer<typeof createRouteSchema>;