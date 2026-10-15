const isInteractive = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(
    target.closest(
      'a,button,input,textarea,select,[contenteditable]:not([contenteditable="false"])',
    ),
  );

export const createViewport = (
  dialog: HTMLDialogElement,
  content: HTMLElement,
  output: HTMLOutputElement,
) => {
  const doc = content.ownerDocument;
  const controller = new AbortController();
  let dragController: AbortController | null = null;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;
  let pinchDistance = 1;
  let pinchScale = 1;
  const pointers = new Map<number, { clientX: number; clientY: number }>();

  const apply = () => {
    content.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    output.textContent = `${Math.round(scale * 100)}%`;

    content.classList.toggle('mermaid-view-content--dragging', pointers.size === 1);
  };

  const zoomIn = () => {
    scale = Math.min(5, scale + 0.25);

    apply();
  };
  const zoomOut = () => {
    scale = Math.max(0.25, scale - 0.25);

    apply();
  };
  const reset = () => {
    scale = 1;
    panX = 0;
    panY = 0;

    apply();
  };
  const distance = () => {
    const [a, b] = [...pointers.values()];

    return Math.max(0.001, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY));
  };
  const baselineDrag = () => {
    const [point] = pointers.values();

    startX = point.clientX;
    startY = point.clientY;
    startPanX = panX;
    startPanY = panY;
  };

  const onMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;

    pointers.set(event.pointerId, event);

    if (pointers.size === 2) {
      scale = Math.min(5, Math.max(0.25, (pinchScale * distance()) / pinchDistance));
    } else {
      panX = startPanX + event.clientX - startX;
      panY = startPanY + event.clientY - startY;
    }

    apply();
  };

  const release = (pointerId: number) => {
    if (content.hasPointerCapture?.(pointerId)) content.releasePointerCapture(pointerId);
  };

  const onUp = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;

    release(event.pointerId);

    if (pointers.size === 1) baselineDrag();

    if (pointers.size === 0) {
      dragController?.abort();
      dragController = null;
    }

    apply();
  };

  content.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || pointers.size >= 2 || isInteractive(event.target)) return;

      pointers.set(event.pointerId, event);
      content.setPointerCapture?.(event.pointerId);

      if (!dragController) {
        dragController = new AbortController();
        const options = { signal: dragController.signal };

        doc.addEventListener('pointermove', onMove, options);
        doc.addEventListener('pointerup', onUp, options);
        doc.addEventListener('pointercancel', onUp, options);
      }

      if (pointers.size === 2) {
        pinchDistance = distance();
        pinchScale = scale;
      } else {
        baselineDrag();
      }

      event.preventDefault();
      apply();
    },
    { signal: controller.signal },
  );

  dialog.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();

      const nextScale = Math.min(5, Math.max(0.25, scale + (event.deltaY > 0 ? -0.15 : 0.15)));
      const rect = content.getBoundingClientRect();
      const factor = nextScale / scale;

      panX -= (event.clientX - rect.left - rect.width / 2) * (factor - 1);
      panY -= (event.clientY - rect.top - rect.height / 2) * (factor - 1);
      scale = nextScale;

      apply();
    },
    { passive: false, signal: controller.signal },
  );

  dialog.addEventListener(
    'keydown',
    (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof Element &&
          event.target.closest('input,textarea,select,[contenteditable]'))
      )
        return;

      switch (event.key) {
        case '+':
        case '=': {
          zoomIn();

          break;
        }
        case '-': {
          zoomOut();

          break;
        }
        case '0': {
          reset();

          break;
        }
        case 'ArrowUp': {
          panY += 40;

          apply();

          break;
        }
        case 'ArrowDown': {
          panY -= 40;

          apply();

          break;
        }
        case 'ArrowLeft': {
          panX += 40;

          apply();

          break;
        }
        case 'ArrowRight': {
          panX -= 40;

          apply();

          break;
        }
        default: {
          return;
        }
      }

      event.preventDefault();
    },
    { signal: controller.signal },
  );

  reset();

  return {
    zoomIn,
    zoomOut,
    reset,
    destroy() {
      controller.abort();
      dragController?.abort();

      for (const id of pointers.keys()) release(id);

      pointers.clear();
    },
  };
};
