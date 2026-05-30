/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import { join } from 'node:path';

const root = __dirname;

export default defineConfig({
  test: {
    include: [
      'src/**/*.spec.ts',
      'src/**/*.test.ts',
      'test/**/*.spec.ts',
      'test/**/*.test.ts',
    ],
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': join(root, 'src'),
    },
  },
});
