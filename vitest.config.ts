import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      },
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/types/**'
      ]
    }
  }
});
