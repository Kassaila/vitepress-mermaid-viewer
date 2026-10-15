import type { MermaidConfig } from 'mermaid';
import type { ViewerCustomization } from './customization';

export interface ViewerControls {
  copySource?: boolean;
  svg?: boolean;
  png?: boolean;
}

export interface MermaidViewerProps {
  /**
   * Raw Mermaid source, without URL encoding.
   */
  source: string;
  /**
   * Used for download filenames; render IDs are generated internally.
   */
  id?: string;
  config?: Readonly<MermaidConfig>;
  appearance?: 'light' | 'dark';
  customization?: ViewerCustomization;
  controls?: ViewerControls;
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

export interface ViewerHandle {
  open(): void;
  close(): void;
  reset(): void;
}
