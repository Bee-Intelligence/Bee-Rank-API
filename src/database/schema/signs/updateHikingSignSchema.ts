import { z } from "zod";
import {insertHikingSignSchema} from "./insertHikingSignSchema";

export const updateHikingSignSchema = insertHikingSignSchema.partial();

export type UpdateHikingSign = z.infer<typeof updateHikingSignSchema>;

