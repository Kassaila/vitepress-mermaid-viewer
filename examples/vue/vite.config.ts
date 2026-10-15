import { defineConfig } from 'vite';
import Vue from 'unplugin-vue/vite';

export default defineConfig({
  plugins: [Vue()],
  optimizeDeps: {
    include: [
      'mermaid > @braintree/sanitize-url',
      'mermaid > dayjs',
      'mermaid > cytoscape-cose-bilkent',
      'mermaid > cytoscape',
    ],
  },
});
