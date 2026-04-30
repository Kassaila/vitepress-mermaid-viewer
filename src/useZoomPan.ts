import { ref, type Ref } from 'vue';

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
  cleanup: () => void;
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

  /**
   * Reactive state for template binding
   */
  const scalePercent = ref('100%');
  const isDragging = ref(false);

  /**
   * Zoom/pan control functions
   */

  const applyTransform = () => {
    const el = contentRef.value;

    if (el) {
      el.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

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

  const onPointerUp = (ev: PointerEvent) => {
    pointers.delete(ev.pointerId);

    if (!_isDragging) {
      return;
    }

    _isDragging = false;
    isDragging.value = false;

    contentRef.value?.classList.remove('is-dragging');
  };

  const onPointerDown = (ev: PointerEvent) => {
    if (ev.button !== 0) {
      return;
    }

    pointers.set(ev.pointerId, ev);
    contentRef.value?.setPointerCapture(ev.pointerId);

    if (pointers.size === 2) {
      _isDragging = false;
      isDragging.value = false;

      contentRef.value?.classList.remove('is-dragging');

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

    contentRef.value?.classList.add('is-dragging');
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
   * Global listeners — removed in cleanup()
   */
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  const cleanup = () => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
  };

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
    cleanup,
  };
};
