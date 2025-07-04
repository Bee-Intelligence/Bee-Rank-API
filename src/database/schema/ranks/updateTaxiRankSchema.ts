import {z} from "zod";
import {createTaxiRankSchema} from "./createTaxiRankSchema";

export const updateTaxiRankSchema = createTaxiRankSchema.partial();

export type UpdateTaxiRank = z.infer<typeof updateTaxiRankSchema>;