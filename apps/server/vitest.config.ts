import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: { DATABASE_URL: 'file:../data/test.db', TMDB_API_KEY: 'test-key' },
    globalSetup: ['./src/test/global-setup.ts'],
    fileParallelism: false,
  },
});
