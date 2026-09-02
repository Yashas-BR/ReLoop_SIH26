import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globalSetup: './tests/global-setup.js',
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});

