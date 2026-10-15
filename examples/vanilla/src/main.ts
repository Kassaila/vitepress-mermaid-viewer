import { enhanceSvg, mountViewer } from '@kassaila/mermaid-viewer';
import type { ViewerError, ViewerHandle, ViewerOptions } from '@kassaila/mermaid-viewer';
import { customization } from './mermaid-viewer';

import '@kassaila/mermaid-viewer/style.css';
import './style.css';

const host = document.querySelector<HTMLElement>('#viewer');
const existing = document.querySelector<HTMLElement>('#existing');
const source = document.querySelector<HTMLTextAreaElement>('#source');
const dark = document.querySelector<HTMLInputElement>('#dark');
const lifecycle = document.querySelector<HTMLButtonElement>('#lifecycle');
const status = document.querySelector<HTMLElement>('#status');
const svg = existing?.querySelector('svg');

if (!host || !existing || !source || !dark || !lifecycle || !status || !svg) {
  throw new Error('Example markup is incomplete');
}

const controller = new AbortController();
const signal = controller.signal;
const options = (): ViewerOptions => ({
  source: source.value,
  appearance: dark.checked ? 'dark' : 'light',
  config: { theme: dark.checked ? 'dark' : 'default' },
  customization,
});
let viewer: ViewerHandle | undefined = mountViewer(host, options());
const enhanced = enhanceSvg(existing, { svg, customization, controls: { copySource: false } });

source.addEventListener('input', () => viewer?.update(options()), { signal });
dark.addEventListener(
  'change',
  () => {
    document.documentElement.style.colorScheme = dark.checked ? 'dark' : 'light';
    viewer?.update(options());
    enhanced.update({
      svg,
      customization,
      appearance: dark.checked ? 'dark' : 'light',
      controls: { copySource: false },
    });
  },
  { signal },
);
lifecycle.addEventListener(
  'click',
  () => {
    if (viewer) {
      viewer.destroy();

      viewer = undefined;
      lifecycle.textContent = 'Mount viewer';
      status.textContent = 'Viewer destroyed';
    } else {
      viewer = mountViewer(host, options());
      lifecycle.textContent = 'Destroy viewer';
    }
  },
  { signal },
);
host.addEventListener(
  'mermaid-viewer:ready',
  () => {
    status.textContent = 'Diagram ready';
  },
  { signal },
);
host.addEventListener(
  'mermaid-viewer:error',
  (event) => {
    const { retainedSvg } = (event as CustomEvent<ViewerError>).detail;

    status.textContent = retainedSvg
      ? 'Invalid source; showing the last valid diagram'
      : 'Unable to render this source';
  },
  { signal },
);

import.meta.hot?.dispose(() => {
  controller.abort();
  viewer?.destroy();
  enhanced.destroy();
});
