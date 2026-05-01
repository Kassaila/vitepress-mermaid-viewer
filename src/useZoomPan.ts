import { onUnmounted, ref, type Ref } from 'vue';

export interface UseZoomPanOptions {
  contentRef: Ref<HTMLElement | null>;
}

export interface UseZoomPanReturn {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  panBy: (dx: number, dy: number) => void;
  onPointerDown: (ev: PointerEvent) => void;
  onWheel: (ev: WheelEvent) => void;
  handleKeydown: (ev: KeyboardEvent) => void;
  scalePercent: Ref<string>;
  isDragging: Ref<boolean>;
  transform: Ref<string>;
}

export const useZoomPan = (options: UseZoomPanOptions): UseZoomPanReturn => {
  const { contentRef } = options;

  /**
   * Hot-path state — plain variables, NOT Vue refs
   */
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let _isDragging = false;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;
  const pointers = new Map<number, PointerEvent>();
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let pointerListenersAttached = false;

  /**
   * Reactive state for template binding
   */
  const scalePercent = ref('100%');
  const isDragging = ref(false);
  const transform = ref('translate(0px, 0px) scale(1)');

  /**
   * Zoom/pan control functions
   */

  const applyTransform = () => {
    transform.value = `translate(${panX}px, ${panY}px) scale(${scale})`;
    scalePercent.value = `${Math.round(scale * 100)}%`;
  };

  const zoomIn = () => {
    scale = Math.min(5, scale + 0.25);

    applyTransform();
  };

  const zoomOut = () => {
    scale = Math.max(0.25, scale - 0.25);

    applyTransform();
  };

  const resetView = () => {
    scale = 1;
    panX = 0;
    panY = 0;

    applyTransform();
  };

  const panBy = (dx: number, dy: number) => {
    panX += dx;
    panY += dy;

    applyTransform();
  };

  /**
   * Pointer event handlers
   */

  const getPointerDist = () => {
    const pts = [...pointers.values()];
    const dx = pts[0].clientX - pts[1].clientX;
    const dy = pts[0].clientY - pts[1].clientY;

    return Math.hypot(dx, dy);
  };

  const onPointerMove = (ev: PointerEvent) => {
    pointers.set(ev.pointerId, ev);

    if (pointers.size === 2) {
      const dist = getPointerDist();

      scale = Math.min(5, Math.max(0.25, pinchStartScale * (dist / pinchStartDist)));

      applyTransform();

      return;
    }

    if (!_isDragging) {
      return;
    }

    panX = startPanX + (ev.clientX - startX);
    panY = startPanY + (ev.clientY - startY);

    applyTransform();
  };

  const detachPointerListeners = () => {
    if (!pointerListenersAttached) {
      return;
    }

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);

    pointerListenersAttached = false;
  };

  const attachPointerListeners = () => {
    if (pointerListenersAttached) {
      return;
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);

    pointerListenersAttached = true;
  };

  const onPointerUp = (ev: PointerEvent) => {
    pointers.delete(ev.pointerId);

    /**
     * Pinch → single-finger transition: re-baseline drag state
     * from the remaining pointer so the next pointermove does not
     * jump from a stale startX/startY.
     */
    if (pointers.size === 1) {
      const remaining = [...pointers.values()][0];

      _isDragging = true;
      isDragging.value = true;
      startX = remaining.clientX;
      startY = remaining.clientY;
      startPanX = panX;
      startPanY = panY;

      return;
    }

    if (pointers.size === 0) {
      if (_isDragging) {
        _isDragging = false;
        isDragging.value = false;
      }

      detachPointerListeners();
    }
  };

  const onPointerDown = (ev: PointerEvent) => {
    if (ev.button !== 0) {
      return;
    }

    pointers.set(ev.pointerId, ev);
    contentRef.value?.setPointerCapture(ev.pointerId);

    attachPointerListeners();

    if (pointers.size === 2) {
      _isDragging = false;
      isDragging.value = false;

      pinchStartDist = getPointerDist();
      pinchStartScale = scale;

      return;
    }

    _isDragging = true;
    isDragging.value = true;
    startX = ev.clientX;
    startY = ev.clientY;
    startPanX = panX;
    startPanY = panY;

    ev.preventDefault();
  };

  /**
   * Wheel zoom and keyboard shortcuts
   */

  const onWheel = (ev: WheelEvent) => {
    ev.preventDefault();

    const delta = ev.deltaY > 0 ? -0.15 : 0.15;
    const newScale = Math.min(5, Math.max(0.25, scale + delta));

    const el = contentRef.value;

    if (el) {
      const rect = el.getBoundingClientRect();
      const cx = ev.clientX - rect.left - rect.width / 2;
      const cy = ev.clientY - rect.top - rect.height / 2;
      const factor = newScale / scale;

      panX -= cx * (factor - 1);
      panY -= cy * (factor - 1);
    }

    scale = newScale;

    applyTransform();
  };

  const handleKeydown = (ev: KeyboardEvent) => {
    switch (ev.key) {
      case '+':
      case '=': {
        ev.preventDefault();
        zoomIn();

        return;
      }
      case '-': {
        ev.preventDefault();
        zoomOut();

        return;
      }
      case '0': {
        ev.preventDefault();
        resetView();

        return;
      }
      /**
       * Arrow keys move the content opposite to the arrow direction
       * (map convention: arrow points where the viewport "looks").
       * ArrowRight reveals content on the right, so the diagram shifts left.
       */
      case 'ArrowUp': {
        ev.preventDefault();
        panBy(0, 40);

        return;
      }
      case 'ArrowDown': {
        ev.preventDefault();
        panBy(0, -40);

        return;
      }
      case 'ArrowLeft': {
        ev.preventDefault();
        panBy(40, 0);

        return;
      }
      case 'ArrowRight': {
        ev.preventDefault();
        panBy(-40, 0);

        return;
      }
      default: {
        return;
      }
    }
  };

  /**
   * Defensive cleanup if the component unmounts mid-drag.
   */
  onUnmounted(() => {
    detachPointerListeners();
  });

  return {
    zoomIn,
    zoomOut,
    resetView,
    panBy,
    onPointerDown,
    onWheel,
    handleKeydown,
    scalePercent,
    isDragging,
    transform,
  };
};
