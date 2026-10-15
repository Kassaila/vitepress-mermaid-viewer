import { emitViewerEvent } from './events';
import { createTrigger } from './trigger';
import type { SvgViewerOptions, ViewerHandle } from './types';

/**
 * Enhance a platform-owned SVG without importing Mermaid or changing its DOM.
 */
export const enhanceSvg = (
  host: HTMLElement,
  initialOptions: SvgViewerOptions,
): ViewerHandle<SvgViewerOptions> => {
  let options = initialOptions;
  let disposed = false;
  let revision = 0;
  let acceptedSvg = initialOptions.svg.outerHTML;
  const validSvg = () => options.svg.isConnected && host.contains(options.svg);
  const trigger = createTrigger(
    host,
    host,
    () =>
      validSvg()
        ? {
            svg: acceptedSvg,
            source: options.source,
          }
        : null,
    options,
  );

  const ready = () => {
    const current = ++revision;

    queueMicrotask(() => {
      if (!disposed && current === revision && validSvg()) {
        emitViewerEvent(host, 'mermaid-viewer:ready', {
          source: options.source ?? '',
          svg: acceptedSvg,
        });
      }
    });
  };

  ready();

  return {
    update(nextOptions) {
      if (disposed) return;

      const svg = nextOptions.svg.outerHTML;
      const changed =
        nextOptions.svg !== options.svg ||
        svg !== acceptedSvg ||
        nextOptions.source !== options.source;

      if (changed) trigger.close();

      if (disposed) return;

      options = nextOptions;
      acceptedSvg = svg;

      trigger.update(options);

      if (changed) ready();
    },
    open: trigger.open,
    close: () => trigger.close(),
    reset: trigger.reset,
    destroy() {
      if (disposed) return;

      disposed = true;
      revision++;
      trigger.destroy();
    },
  };
};
