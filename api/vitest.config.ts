import { defineConfig } from 'vitest/config';

// Цэвэр функцүүдийг (domain/, duel/engine, llm/validate, lib/auth) Node орчинд шалгана.
// scripts/*.test.ts нь node:fs ашигладаг тул scripts/tsconfig.json-оор (Node төрөлтэй) typecheck хийгдэнэ.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
