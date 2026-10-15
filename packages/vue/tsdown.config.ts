import { defineConfig } from 'tsdown';
import Vue from 'unplugin-vue/rolldown';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  entry: { index: 'src/index.ts', mermaid: 'src/setup.ts' },
  format: ['esm'],
  dts: { vue: true },
  target: 'es2022',
  clean: true,
  treeshake: true,
  sourcemap: isDev,
  minify: !isDev,
  deps: { neverBundle: ['vue', 'mermaid'] },
  platform: 'neutral',
  plugins: [Vue({ isProduction: !isDev })],
});
