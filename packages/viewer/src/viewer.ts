import type { RenderResult } from 'mermaid';
import { render } from './mermaid';
import { emitViewerEvent } from './events';
import { applyPresentation, getLabels } from './presentation';
import { createTrigger } from './trigger';
import type { ViewerHandle, ViewerOptions } from './types';

const EMPTY_CONFIG = Object.freeze({});

/**
 * The caller owns the empty host; this instance owns only its child figure and dialog.
 */
export const mountViewer = (host: HTMLElement, initialOptions: ViewerOptions): ViewerHandle => {
  /**
   * Frameworks may keep their own comment anchor inside an otherwise empty host.
   */
  if ([...host.childNodes].some((node) => node.nodeType !== 8)) {
    throw new Error('mountViewer requires an empty, dedicated host');
  }

  const chart = host.ownerDocument.createElement('figure');
  let options = initialOptions;
  let committed: (RenderResult & { source: string }) | null = null;
  let error: string | null = null;
  let pending = true;
  let disposed = false;
  let revision = 0;
  let imageCleanup = () => {};

  chart.className = 'mv-root mv-diagram';

  host.append(chart);

  const trigger = createTrigger(chart, host, () => (pending ? null : committed), options);

  const refreshUI = () => {
    const labels = getLabels(options);

    applyPresentation(chart, options);
    chart.classList.toggle('mv-diagram--loading', pending);
    chart.classList.toggle('mv-diagram--error', Boolean(error));
    chart.removeAttribute('aria-busy');

    /**
     * These state attributes are owned by the source renderer, not the trigger controller.
     */
    if (chart.getAttribute('role') === 'alert') chart.removeAttribute('role');

    if (
      pending ||
      error ||
      chart.getAttribute('aria-label') === labels.loading ||
      chart.getAttribute('aria-label') === labels.error
    ) {
      chart.removeAttribute('aria-label');
    }

    trigger.update(options);

    if (pending) {
      chart.setAttribute('aria-busy', 'true');
      chart.setAttribute('aria-label', labels.loading);
    } else if (error) {
      const message = host.ownerDocument.createElement('p');
      const details = host.ownerDocument.createElement('details');
      const summary = host.ownerDocument.createElement('summary');
      const source = host.ownerDocument.createElement('pre');

      message.textContent = `${labels.error}: ${error}`;
      summary.textContent = labels.errorSource;
      source.textContent = options.source;

      details.append(summary, source);
      chart.replaceChildren(message, details);
      chart.setAttribute('role', 'alert');
      chart.setAttribute('aria-label', labels.error);
    }
  };

  const renderChart = async (refreshImages = true) => {
    const currentRevision = ++revision;
    const current = () => !disposed && revision === currentRevision;
    const { source } = options;
    const config = options.config ?? EMPTY_CONFIG;
    const height = chart.offsetHeight;

    imageCleanup();
    trigger.close();

    if (!current()) return;

    pending = true;
    error = null;

    if (!committed) chart.replaceChildren();

    if (height) chart.style.minHeight = `${height}px`;

    refreshUI();

    try {
      const result = await render(source, config, current, host.ownerDocument);

      if (!result || !current()) return;

      const template = host.ownerDocument.createElement('template');

      template.innerHTML = result.svg;

      if (!template.content.querySelector('svg') || template.content.querySelector('iframe')) {
        throw new Error(
          'Mermaid viewer requires inline SVG output; sandbox/iframe output is unsupported',
        );
      }

      chart.replaceChildren(template.content);

      committed = { ...result, source };
      pending = false;

      chart.style.removeProperty('min-height');
      refreshUI();
      result.bindFunctions?.(chart);

      if (!current()) return;

      emitViewerEvent(host, 'mermaid-viewer:ready', { source, svg: result.svg });

      if (!current()) return;

      const images = refreshImages
        ? [...chart.querySelectorAll('img')].filter((image) => !image.complete)
        : [];

      if (images.length) {
        const controller = new AbortController();
        let remaining = images.length;
        const onSettled = () => {
          if (--remaining === 0) {
            controller.abort();

            if (current()) void renderChart(false);
          }
        };

        imageCleanup = () => controller.abort();

        for (const image of images) {
          image.addEventListener('load', onSettled, { once: true, signal: controller.signal });
          image.addEventListener('error', onSettled, { once: true, signal: controller.signal });
        }
      }
    } catch (cause) {
      if (!current()) return;

      pending = false;
      error = committed ? null : cause instanceof Error ? cause.message : String(cause);

      chart.style.removeProperty('min-height');
      refreshUI();
      emitViewerEvent(host, 'mermaid-viewer:error', {
        stage: 'render',
        cause,
        retainedSvg: Boolean(committed),
      });
    }
  };

  void renderChart();

  return {
    update(nextOptions) {
      if (disposed) return;

      const needsRender =
        options.source !== nextOptions.source || options.config !== nextOptions.config;

      options = nextOptions;

      if (needsRender) void renderChart();
      else refreshUI();
    },
    open: trigger.open,
    close: () => trigger.close(),
    reset: trigger.reset,
    destroy() {
      if (disposed) return;

      disposed = true;
      revision++;
      imageCleanup();
      trigger.destroy();
      chart.remove();

      committed = null;
    },
  };
};
