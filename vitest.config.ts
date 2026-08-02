import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Inline empty PostCSS config so Vitest doesn't try to load postcss.config.js
  // (Tailwind isn't needed to run the pure-logic unit tests).
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
