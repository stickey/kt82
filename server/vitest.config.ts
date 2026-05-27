import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/__tests__/setup.ts'],
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/kt82_test',
    },
    pool: 'forks',
  },
})
