import type { ViewerHandle as DOMViewerHandle, ViewerOptions } from '@kassaila/mermaid-viewer';

export type { ViewerControls, ViewerError, ViewerReady } from '@kassaila/mermaid-viewer';
export type MermaidViewerProps = ViewerOptions;
export type ViewerHandle = Pick<DOMViewerHandle, 'open' | 'close' | 'reset'>;
