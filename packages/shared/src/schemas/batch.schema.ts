import { z } from 'zod';
import { AppendixAKitSchema } from './kit.schema.js';

export const BatchInputCaseSchema = z.object({
  id: z.string(),
  jd: z.string(),
  company_url: z.string(),
  days: z.number().int().positive(),
});

export const BatchInputSchema = z.array(BatchInputCaseSchema);

export const BatchCaseErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const BatchCaseResultSchema = z.object({
  id: z.string(),
  status: z.enum(['ok', 'failed']),
  kit: AppendixAKitSchema.nullable(),
  error: BatchCaseErrorSchema.nullable(),
});

export const BatchOutputSchema = z.object({
  version: z.literal('1.0'),
  generated_at: z.string(), // ISO 8601 string
  kits: z.array(BatchCaseResultSchema),
});
