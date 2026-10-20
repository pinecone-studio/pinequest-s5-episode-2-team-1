import { defineConfig } from 'vitest/config';

// Цэвэр функцүүдийг (domain/, duel/engine, llm/validate, lib/auth) Node орчинд шалгана.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
