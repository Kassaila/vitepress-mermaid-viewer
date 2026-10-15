import { defineConfig } from 'vitest/config';
import Vue from 'unplugin-vue/vite';

export default defineConfig({
  plugins: [Vue()],
  test: {
    environment: 'happy-dom',
    include: ['__tests__/**/*.test.ts'],
    setupFiles: ['__tests__/helpers/dialog.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/index.ts'],
    },
  },
});
