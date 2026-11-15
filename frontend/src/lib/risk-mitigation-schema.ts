import { z } from "zod";

export const mitigationSchema = z.object({
  id: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  frequency: z.string().optional(),
  recurringInterval: z.string().optional().nullable(),
  reportDay: z.number().optional().nullable(),
  reportDate: z.number().int().optional().nullable(),
  executionScheduleText: z.string().optional(),
  targetCost: z.number().optional(),
  action: z.string().default(""),
  owner: z.string().default(""),
  treatmentOwnerId: z.string().optional(),
  externalPicId: z.string().optional(),
  mitigationType: z
    .enum(["reduce_probability", "reduce_impact", "reduce_both"])
    .default("reduce_probability"),

});
