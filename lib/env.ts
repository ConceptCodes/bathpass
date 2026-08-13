import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).default('postgres://localhost:5432/bathpass'),
    SESSION_SECRET: z.string().min(16).default('bathpass-dev-secret-key-do-not-use-in-prod'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
