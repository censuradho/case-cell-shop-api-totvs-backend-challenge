/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import { join } from 'node:path';

const root = __dirname;

export default defineConfig({
  test: {
    include: ['test/**/*.integration.spec.ts'],
    environment: 'node',
    globals: true,
    globalSetup: ['./test/integration/global-setup.ts'],
    setupFiles: ['./test/integration/env-setup.ts'],
    maxWorkers: 1,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': join(root, 'src'),
    },
  },
});
