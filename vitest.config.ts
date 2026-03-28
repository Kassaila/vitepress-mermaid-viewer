import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import Vue from 'unplugin-vue/vite';

export default defineConfig({
  plugins: [Vue()],
  resolve: {
    alias: {
      'virtual:mermaid-config': resolve(
        __dirname,
        '__tests__/helpers/__mocks__/virtual-mermaid-config.ts',
      ),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
