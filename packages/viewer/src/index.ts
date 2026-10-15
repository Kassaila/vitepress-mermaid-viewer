export { mountViewer } from './viewer';
export { enhanceSvg } from './enhance-svg';
export { defaultViewerLabels } from './customization';
export type { ViewerCssVariables, ViewerCustomization, ViewerLabels } from './customization';
export type {
  SvgViewerOptions,
  ViewerControls,
  ViewerError,
  ViewerEventMap,
  ViewerHandle,
  ViewerOptions,
  ViewerReady,
  ViewerUIOptions,
} from './types';

import './styles/mermaid.css';
import './styles/zoom.css';
