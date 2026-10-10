import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    isolate: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/setup.ts'],
  },
});
