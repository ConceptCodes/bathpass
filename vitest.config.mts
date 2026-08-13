import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
  test: {
    environment: 'node',
    fileParallelism: false,
    env: {
      DATABASE_URL: 'postgres://localhost:5432/bathpass_test',
    },
  },
});
