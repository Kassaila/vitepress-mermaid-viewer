import type { ViewerCustomization } from 'vitepress-mermaid-viewer';

/** Override component CSS tokens or JS labels here; VitePress colors are mapped automatically. */
export const viewerCustomization = {
  css: { '--mv-radius': '0.75rem' },
  labels: { dialog: 'Diagram viewer' },
} satisfies ViewerCustomization;
