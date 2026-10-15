import { cloneMermaidSvg, getSvgSource } from './helpers/svg';
import { downloadFilePng, downloadFileSvg } from './helpers/export';
import { lockBodyScroll } from './helpers/scroll-lock';
import { applyPresentation, getLabels } from './presentation';
import { createViewport } from './viewport';
import type { ViewerError, ViewerUIOptions } from './types';

export interface DiagramRecord {
  svg: string;
  source?: string;
}

export const createDialog = (
  trigger: HTMLElement,
  record: DiagramRecord,
  initialOptions: ViewerUIOptions,
  onClose: () => void,
  onError: (error: ViewerError) => void,
) => {
  const doc = trigger.ownerDocument;
  const controller = new AbortController();
  const dialog = doc.createElement('dialog');
  const controls = doc.createElement('aside');
  const output = doc.createElement('output');
  const content = doc.createElement('figure');
  let options = initialOptions;
  let disposed = false;
  let copied = false;
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;
  let cancelPng: (() => void) | undefined;
  let pngExporting = false;
  let unlock = () => {};

  dialog.className = 'mv-root mermaid-view-overlay';
  controls.className = 'mermaid-view-controls';
  output.className = 'mermaid-view-scale';

  output.setAttribute('aria-live', 'polite');

  content.className = 'mermaid-view-content';
  content.innerHTML = cloneMermaidSvg(record.svg, getLabels(options).diagram);

  controls.append(output);
  dialog.append(controls, content);

  const viewport = createViewport(dialog, content, output);
  const button = (text: string, className: string, action: () => void) => {
    const element = doc.createElement('button');

    element.type = 'button';
    element.className = `mermaid-view-btn ${className}`;
    element.textContent = text;

    element.addEventListener('click', action, { signal: controller.signal });
    controls.append(element);

    return element;
  };
  const closeButton = button('\u2715', 'mermaid-view-btn_close', onClose);
  const zoomInButton = button('+', 'mermaid-view-btn_zoom', viewport.zoomIn);
  const zoomOutButton = button('\u2212', 'mermaid-view-btn_zoom', viewport.zoomOut);
  const resetButton = button('\u21bb', 'mermaid-view-btn_zoom', viewport.reset);
  const reportExportError = (cause: unknown) => {
    if (!disposed) onError({ stage: 'export', cause, retainedSvg: true });
  };
  const copyButton = button('\u2398', 'mermaid-view-btn_download', () => {
    void (async () => {
      try {
        const clipboard = doc.defaultView?.navigator.clipboard;

        if (!clipboard) throw new Error('Clipboard API is unavailable');

        await clipboard.writeText(record.source ?? '');

        if (disposed) return;

        copied = true;

        clearTimeout(copyTimeout);

        copyTimeout = setTimeout(() => {
          copied = false;

          update(options);
        }, 2000);

        update(options);
      } catch (cause) {
        if (!disposed) onError({ stage: 'clipboard', cause, retainedSvg: true });
      }
    })();
  });
  const svgButton = button('SVG', 'mermaid-view-btn_download mermaid-view-btn_text', () => {
    try {
      downloadFileSvg(getSvgSource(content), options.id || 'diagram');
    } catch (cause) {
      reportExportError(cause);
    }
  });
  const pngButton = button('PNG', 'mermaid-view-btn_download mermaid-view-btn_text', () => {
    if (pngExporting) return;

    pngExporting = true;

    try {
      cancelPng = downloadFilePng(getSvgSource(content), options.id || 'diagram', (cause) => {
        pngExporting = false;

        if (cause) reportExportError(cause);
      });
    } catch (cause) {
      pngExporting = false;

      reportExportError(cause);
    }
  });

  const update = (nextOptions: ViewerUIOptions) => {
    options = nextOptions;
    const labels = getLabels(options);

    applyPresentation(dialog, options, trigger);
    dialog.setAttribute('aria-label', labels.dialog);
    output.setAttribute('aria-label', labels.zoomLevel);

    for (const [element, label] of [
      [closeButton, labels.close],
      [zoomInButton, labels.zoomIn],
      [zoomOutButton, labels.zoomOut],
      [resetButton, labels.reset],
      [copyButton, copied ? labels.copied : labels.copyCode],
      [svgButton, labels.download],
      [pngButton, labels.downloadPng],
    ] as const) {
      element.title = label;

      element.setAttribute('aria-label', label);
    }

    copyButton.textContent = copied ? '\u2713' : '\u2398';

    copyButton.classList.toggle('mermaid-view-btn--copied', copied);

    copyButton.hidden = !record.source || options.controls?.copySource === false;
    svgButton.hidden = options.controls?.svg === false;
    pngButton.hidden = options.controls?.png === false;
  };

  const destroy = () => {
    if (disposed) return;

    disposed = true;

    controller.abort();
    viewport.destroy();
    cancelPng?.();
    clearTimeout(copyTimeout);

    if (dialog.open) dialog.close();

    dialog.remove();
    unlock();
  };

  dialog.addEventListener('close', onClose, { signal: controller.signal });
  dialog.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault();
      onClose();
    },
    { signal: controller.signal },
  );

  update(options);
  doc.body.append(dialog);

  try {
    dialog.showModal();

    unlock = lockBodyScroll(doc.body);

    closeButton.focus({ preventScroll: true });
  } catch (cause) {
    destroy();
    throw cause;
  }

  return { update, reset: viewport.reset, destroy };
};
