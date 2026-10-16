import type { ViewerHandle as DOMViewerHandle, ViewerOptions } from 'mermaid-viewer';

export type { ViewerControls, ViewerError, ViewerReady } from 'mermaid-viewer';
export type MermaidViewerProps = ViewerOptions;
export type ViewerHandle = Pick<DOMViewerHandle, 'open' | 'close' | 'reset'>;
