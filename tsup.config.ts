import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['vue', 'vitepress', 'mermaid'],
  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      '.vue': 'ts',
      '.css': 'text',
    };
  },
});
