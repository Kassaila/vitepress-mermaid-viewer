import { defineConfig } from 'tsdown';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  entry: { index: 'src/index.ts', mermaid: 'src/setup.ts' },
  format: ['esm'],
  dts: true,
  target: 'es2022',
  clean: true,
  treeshake: true,
  sourcemap: isDev,
  minify: !isDev,
  deps: { neverBundle: ['mermaid'] },
  platform: 'neutral',
});
