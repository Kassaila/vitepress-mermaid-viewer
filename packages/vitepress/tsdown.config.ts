import { defineConfig } from 'tsdown';
import Vue from 'unplugin-vue/rolldown';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    treeshake: true,
    sourcemap: isDev,
    minify: !isDev,
    deps: {
      neverBundle: ['vue', 'vitepress', 'mermaid', 'vue-mermaid-viewer'],
    },
    platform: 'neutral',
  },
  {
    entry: { Mermaid: 'src/Mermaid.vue' },
    format: ['esm', 'cjs'],
    dts: false,
    treeshake: true,
    sourcemap: isDev,
    minify: !isDev,
    deps: {
      neverBundle: [
        'vue',
        'vitepress',
        'mermaid',
        'virtual:mermaid-config',
        /^vue-mermaid-viewer$/,
      ],
      alwaysBundle: ['vue-mermaid-viewer/style.css'],
    },
    platform: 'neutral',
    plugins: [Vue({ isProduction: !isDev })],
  },
]);
