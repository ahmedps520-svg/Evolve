import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify('test'),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // A timezone with DST, so date logic is exercised across clock changes.
    env: { TZ: 'America/New_York' },
  },
});
