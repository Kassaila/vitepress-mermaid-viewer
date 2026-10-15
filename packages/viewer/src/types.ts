import type { MermaidConfig } from 'mermaid';
import type { ViewerCustomization } from './customization';

export interface ViewerControls {
  copySource?: boolean;
  svg?: boolean;
  png?: boolean;
}

export interface ViewerUIOptions {
  /**
   * Download filename suffix. Never used as a DOM render ID.
   */
  id?: string;
  appearance?: 'light' | 'dark';
  customization?: ViewerCustomization;
  controls?: ViewerControls;
  /**
   * Disable both click and keyboard trigger behavior when providing an external control.
   */
  openOnDiagramClick?: boolean;
}

export interface ViewerOptions extends ViewerUIOptions {
  source: string;
  /**
   * Replace the object to request a new render; deep mutations are not observed.
   */
  config?: Readonly<MermaidConfig>;
}

export interface SvgViewerOptions extends ViewerUIOptions {
  /**
   * Trusted, existing Mermaid SVG. The viewer never modifies or removes this element.
   */
  svg: SVGSVGElement;
  source?: string;
}

export interface ViewerError {
  stage: 'render' | 'export' | 'clipboard';
  cause: unknown;
  retainedSvg: boolean;
}

export interface ViewerReady {
  source: string;
  svg: string;
}

export interface ViewerEventMap {
  'mermaid-viewer:ready': CustomEvent<ViewerReady>;
  'mermaid-viewer:error': CustomEvent<ViewerError>;
  'mermaid-viewer:open': CustomEvent<void>;
  'mermaid-viewer:close': CustomEvent<void>;
}

export interface ViewerHandle<Options = ViewerOptions> {
  /**
   * Full replacement, including resetting omitted optional fields to defaults.
   */
  update(options: Options): void;
  open(): void;
  close(): void;
  reset(): void;
  destroy(): void;
}
