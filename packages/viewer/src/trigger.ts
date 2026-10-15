import { createDialog } from './dialog';
import type { DiagramRecord } from './dialog';
import { emitViewerEvent } from './events';
import { getLabels } from './presentation';
import type { ViewerUIOptions } from './types';

const activeDialogs = new WeakMap<Document, () => void>();

export const createTrigger = (
  trigger: HTMLElement,
  host: HTMLElement,
  getRecord: () => DiagramRecord | null,
  initialOptions: ViewerUIOptions,
) => {
  const doc = trigger.ownerDocument;
  const controller = new AbortController();
  const ownedAttributes = new Map<string, string>();
  let options = initialOptions;
  let dialog: ReturnType<typeof createDialog> | null = null;
  let previousActive: HTMLElement | null = null;
  let disposed = false;

  const restoreAttributes = () => {
    for (const [name, value] of ownedAttributes) {
      if (trigger.getAttribute(name) === value) trigger.removeAttribute(name);
    }

    ownedAttributes.clear();
  };

  const close = (restoreFocus = true) => {
    if (!dialog) return;

    const current = dialog;
    const focusTarget = previousActive;

    dialog = null;
    previousActive = null;

    if (activeDialogs.get(doc) === close) activeDialogs.delete(doc);

    current.destroy();

    if (restoreFocus && focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });

    if (!disposed) emitViewerEvent(host, 'mermaid-viewer:close', undefined);
  };

  const open = () => {
    if (disposed || dialog || !trigger.isConnected) return;

    const record = getRecord();

    if (!record) return;

    activeDialogs.get(doc)?.();

    if (disposed) return;

    previousActive = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
    dialog = createDialog(
      trigger,
      record,
      options,
      () => close(),
      (error) => {
        if (!disposed) emitViewerEvent(host, 'mermaid-viewer:error', error);
      },
    );

    activeDialogs.set(doc, close);
    emitViewerEvent(host, 'mermaid-viewer:open', undefined);
  };

  const isNestedInteractive = (event: Event) =>
    event.target instanceof Element &&
    event.target !== trigger &&
    Boolean(event.target.closest('a,button,input,textarea,select,[contenteditable]'));

  trigger.addEventListener(
    'click',
    (event) => {
      if (
        options.openOnDiagramClick !== false &&
        !event.defaultPrevented &&
        !isNestedInteractive(event)
      )
        open();
    },
    { signal: controller.signal },
  );
  trigger.addEventListener(
    'keydown',
    (event) => {
      if (
        options.openOnDiagramClick !== false &&
        !isNestedInteractive(event) &&
        (event.key === 'Enter' || event.key === ' ')
      ) {
        event.preventDefault();
        open();
      }
    },
    { signal: controller.signal },
  );

  const update = (nextOptions: ViewerUIOptions) => {
    if (disposed) return;

    options = nextOptions;

    restoreAttributes();

    if (options.openOnDiagramClick !== false && getRecord()) {
      for (const [name, value] of [
        ['role', 'button'],
        ['tabindex', '0'],
        ['aria-label', getLabels(options).trigger],
      ]) {
        if (!trigger.hasAttribute(name)) {
          trigger.setAttribute(name, value);
          ownedAttributes.set(name, value);
        }
      }
    }

    dialog?.update(options);
  };

  update(options);

  return {
    open,
    close,
    update,
    reset: () => dialog?.reset(),
    destroy() {
      if (disposed) return;

      disposed = true;

      controller.abort();
      close(false);
      restoreAttributes();
    },
  };
};
