/**
 * Shared vitest setup for unit tests across the workspace.
 *
 * Import this in your `vitest.config.ts` setupFiles for consistent test setup:
 * ```ts
 * export default defineConfig({
 *   test: {
 *     setupFiles: ['@repo/config/test/setup'],
 *   },
 * });
 * ```
 *
 * For backend integration tests, see `apps/web/server/trpc/test-utils/`
 * (caller factory + TEST_IDS) and `apps/web/vitest.integration.config.ts`.
 *
 * NOTE: NODE_ENV is set at top level, NOT inside `beforeAll`. Vitest's
 * `setupFiles` execute their top-level code before the test module evaluates,
 * but `beforeAll` hooks run AFTER imports. Anything that reads
 * `process.env.NODE_ENV` at module-load time would otherwise see the wrong
 * value.
 */

process.env.NODE_ENV = 'test';
