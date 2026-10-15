/**
 * CSS overrides apply to both the diagram and the dialog teleported to body.
 */
export const viewerCssProperties = [
  '--mv-bg',
  '--mv-surface',
  '--mv-surface-hover',
  '--mv-surface-active',
  '--mv-text',
  '--mv-border',
  '--mv-accent',
  '--mv-accent-hover',
  '--mv-accent-muted',
  '--mv-danger',
  '--mv-radius',
  '--mv-padding',
  '--mv-min-height',
  '--mv-font-family',
] as const;

export type ViewerCssVariables = Partial<Record<(typeof viewerCssProperties)[number], string>>;

export const defaultViewerLabels = {
  trigger: 'Open diagram in fullscreen viewer',
  loading: 'Loading diagram',
  error: 'Failed to render diagram',
  errorSource: 'Diagram source',
  diagram: 'Mermaid diagram',
  dialog: 'Diagram viewer',
  zoomLevel: 'Zoom level',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset zoom',
  close: 'Close',
  download: 'Download SVG',
  downloadPng: 'Download PNG',
  copyCode: 'Copy diagram source',
  copied: 'Copied!',
} as const;

export type ViewerLabels = { [Key in keyof typeof defaultViewerLabels]: string };

export interface ViewerCustomization {
  css?: ViewerCssVariables;
  labels?: Partial<ViewerLabels>;
}
