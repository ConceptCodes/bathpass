import { z } from 'zod';
import rawConfig from '@/bathpass.config.json';

const bathroomConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  locationHint: z.string().nullable().optional(),
  state: z.enum(['open', 'closed']).default('open'),
});

const venueConfigSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  responseWindowSeconds: z.number().int().positive().default(300),
  timeZone: z.string().default('America/Chicago'),
});

const defaultOperatorConfigSchema = z.object({
  id: z.string().min(1),
  authSubject: z.string().min(1),
  displayLabel: z.string().min(1),
  role: z.string().default('operator'),
});

export const appConfigSchema = z.object({
  venue: venueConfigSchema,
  bathrooms: z.array(bathroomConfigSchema).min(1),
  defaultOperator: defaultOperatorConfigSchema,
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfig: AppConfig = appConfigSchema.parse(rawConfig);
