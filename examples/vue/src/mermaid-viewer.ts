import type { ViewerCustomization } from 'vue-mermaid-viewer';

/**
 * Application customization: CSS tokens and JS labels live in one typed object.
 */
export const viewerCustomization = {
  css: { '--mv-accent': '#a03592', '--mv-radius': '1rem' },
  labels: { trigger: 'Open example diagram', dialog: 'Example diagram viewer' },
} satisfies ViewerCustomization;
