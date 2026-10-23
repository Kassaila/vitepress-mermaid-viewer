import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: [
      'mermaid > @braintree/sanitize-url',
      'mermaid > dayjs',
      'mermaid > cytoscape-cose-bilkent',
      'mermaid > cytoscape',
    ],
  },
});
