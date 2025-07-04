import {z} from "zod";

export const createNearbyQuerySchema = z.object({
    latitude: z
        .string()
        .min(1, "Latitude is required")
        .transform((val) => {
            const num = Number.parseFloat(val);
            if (isNaN(num)) throw new Error("Invalid latitude format");
            if (num < -90 || num > 90)
                throw new Error("Latitude must be between -90 and 90");
            return num;
        }),
    longitude: z
        .string()
        .min(1, "Longitude is required")
        .transform((val) => {
            const num = Number.parseFloat(val);
            if (isNaN(num)) throw new Error("Invalid longitude format");
            if (num < -180 || num > 180)
                throw new Error("Longitude must be between -180 and 180");
            return num;
        }),
    radius: z
        .string()
        .optional()
        .transform((val) => {
            if (!val) return 5000; // Default 5km
            const num = Number.parseFloat(val);
            if (isNaN(num)) throw new Error("Invalid radius format");
            if (num <= 0) throw new Error("Radius must be positive");
            if (num > 50000) throw new Error("Radius cannot exceed 50km");
            return num;
        }),
});


export type createNearbyQuery = z.infer<typeof createNearbyQuerySchema>;