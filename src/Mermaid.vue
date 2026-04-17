<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import { render, init } from './mermaid';

import './styles/mermaid.css';
import './styles/zoom.css';

const props = defineProps({
  graph: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    required: false,
    default: 'mermaid',
  },
});

const LABELS = {
  trigger: 'Open diagram in fullscreen viewer',
  diagram: 'Mermaid diagram',
  dialog: 'Diagram viewer',
  zoomLevel: 'Zoom level',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset zoom',
  close: 'Close',
} as const;

const ICONS = {
  close: '\u2715',
  zoomIn: '+',
  zoomOut: '\u2212',
  reset: '\u21BB',
} as const;

const CLASSES = {
  overlay: 'mermaid-zoom-overlay',
  content: 'mermaid-zoom-content',
  controls: 'mermaid-zoom-controls',
  scale: 'mermaid-zoom-scale',
  btn: 'mermaid-zoom-btn',
  dragging: 'is-dragging',
} as const;

const { useData } = await import('vitepress');
const { page } = useData();

const pluginSettings = ref({
  securityLevel: 'loose',
  startOnLoad: false,
  externalDiagrams: [],
});

const svg = ref<string | null>(null);
const mermaidPageTheme = ref('');
let mut: MutationObserver | null = null;

const renderChart = async () => {
  const hasDarkClass = document.documentElement.classList.contains('dark');
  const mermaidConfig = {
    ...pluginSettings.value,
  };

  if (mermaidPageTheme.value) {
    mermaidConfig.theme = mermaidPageTheme.value;
  }

  if (hasDarkClass) {
    mermaidConfig.theme = 'dark';
  }

  const svgCode = await render(props.id, decodeURIComponent(props.graph), mermaidConfig);

  const salt = Math.random().toString(36).substring(7);

  svg.value = `${svgCode} <span style="display: none">${salt}</span>`;
};

onMounted(async () => {
  mermaidPageTheme.value = page.value.frontmatter?.mermaidTheme || '';

  await init(pluginSettings.value.externalDiagrams);

  const settings = await import('virtual:mermaid-config');

  if (settings?.default) {
    pluginSettings.value = settings.default;
  }

  let prevDark = document.documentElement.classList.contains('dark');

  mut = new MutationObserver(() => {
    const isDark = document.documentElement.classList.contains('dark');

    if (isDark !== prevDark) {
      prevDark = isDark;

      void renderChart();
    }
  });

  mut.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  await renderChart();

  const hasImages = (/<img([\w\W]+?)>/.exec(decodeURIComponent(props.graph))?.length ?? 0) > 0;

  if (hasImages) {
    setTimeout(() => {
      const imgElements = document.getElementsByTagName('img');
      const imgs = Array.from(imgElements);

      if (imgs.length) {
        void Promise.all(
          imgs
            .filter((img) => !img.complete)
            .map(
              (img) =>
                new Promise((resolve) => {
                  img.onload = img.onerror = resolve;
                }),
            ),
        ).then(async () => {
          await renderChart();
        });
      }
    }, 100);
  }
});

onUnmounted(() => mut?.disconnect());

const cloneMermaidSvg = (svgEl: SVGElement): SVGElement => {
  const clone = svgEl.cloneNode(true) as SVGElement;
  const origId = svgEl.id;

  if (!clone.hasAttribute('role')) {
    clone.setAttribute('role', 'img');
  }

  if (!clone.hasAttribute('aria-label') && !clone.hasAttribute('aria-labelledby')) {
    clone.setAttribute('aria-label', LABELS.diagram);
  }

  if (!origId) {
    return clone;
  }

  const newId = origId + '-zoom';

  clone.id = newId;

  const style = clone.querySelector('style');

  if (style?.textContent) {
    style.textContent = style.textContent.replaceAll('#' + origId, '#' + newId);
  }

  return clone;
};

const createBtn = (text: string, title: string): HTMLButtonElement => {
  const btn = document.createElement('button');

  btn.className = CLASSES.btn;
  btn.textContent = text;
  btn.title = title;

  btn.setAttribute('aria-label', title);

  return btn;
};

const onTriggerKeydown = (ev: KeyboardEvent) => {
  if (ev.key !== 'Enter' && ev.key !== ' ') {
    return;
  }

  ev.preventDefault();
  openZoom(ev);
};

const openZoom = (e: Event) => {
  const target = e.currentTarget as HTMLElement;
  const svgEl = target.querySelector('svg');

  if (!svgEl) {
    return;
  }

  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;

  const pointers = new Map<number, PointerEvent>();
  let pinchStartDist = 0;
  let pinchStartScale = 1;

  const previousActive =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const dialog = document.createElement('dialog');

  dialog.className = CLASSES.overlay;

  dialog.setAttribute('aria-label', LABELS.dialog);

  const content = document.createElement('div');

  content.className = CLASSES.content;

  content.appendChild(cloneMermaidSvg(svgEl));

  const btnClose = createBtn(ICONS.close, LABELS.close);
  const btnZoomIn = createBtn(ICONS.zoomIn, LABELS.zoomIn);
  const btnZoomOut = createBtn(ICONS.zoomOut, LABELS.zoomOut);
  const btnReset = createBtn(ICONS.reset, LABELS.reset);

  const scaleDisplay = document.createElement('output');

  scaleDisplay.className = CLASSES.scale;
  scaleDisplay.textContent = `${Math.round(scale * 100)}%`;

  scaleDisplay.setAttribute('aria-label', LABELS.zoomLevel);
  scaleDisplay.setAttribute('aria-live', 'polite');

  const controls = document.createElement('div');

  controls.className = CLASSES.controls;

  controls.append(scaleDisplay, btnClose, btnZoomIn, btnZoomOut, btnReset);

  dialog.append(controls, content);

  const applyTransform = () => {
    content.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    scaleDisplay.textContent = `${Math.round(scale * 100)}%`;
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

    if (!isDragging) {
      return;
    }

    panX = startPanX + (ev.clientX - startX);
    panY = startPanY + (ev.clientY - startY);

    applyTransform();
  };

  const onPointerUp = (ev: PointerEvent) => {
    pointers.delete(ev.pointerId);

    if (!isDragging) {
      return;
    }

    isDragging = false;

    content.classList.remove(CLASSES.dragging);
  };

  const cleanup = () => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    dialog.remove();

    document.body.style.overflow = '';

    previousActive?.focus({ preventScroll: true });
  };

  dialog.addEventListener('close', cleanup);

  btnZoomIn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    zoomIn();
  });

  btnZoomOut.addEventListener('click', (ev) => {
    ev.stopPropagation();
    zoomOut();
  });

  btnReset.addEventListener('click', (ev) => {
    ev.stopPropagation();
    resetView();
  });

  btnClose.addEventListener('click', (ev) => {
    ev.stopPropagation();
    dialog.close();
  });

  content.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) {
      return;
    }

    pointers.set(ev.pointerId, ev);
    content.setPointerCapture(ev.pointerId);

    if (pointers.size === 2) {
      isDragging = false;

      content.classList.remove(CLASSES.dragging);

      pinchStartDist = getPointerDist();
      pinchStartScale = scale;

      return;
    }

    isDragging = true;
    startX = ev.clientX;
    startY = ev.clientY;
    startPanX = panX;
    startPanY = panY;

    content.classList.add(CLASSES.dragging);
    ev.preventDefault();
  });

  dialog.addEventListener('keydown', (ev) => {
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
  });

  dialog.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();

      const delta = ev.deltaY > 0 ? -0.15 : 0.15;
      const newScale = Math.min(5, Math.max(0.25, scale + delta));

      const rect = content.getBoundingClientRect();
      const cx = ev.clientX - rect.left - rect.width / 2;
      const cy = ev.clientY - rect.top - rect.height / 2;
      const factor = newScale / scale;

      panX -= cx * (factor - 1);
      panY -= cy * (factor - 1);
      scale = newScale;

      applyTransform();
    },
    { passive: false },
  );

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  document.body.appendChild(dialog);

  dialog.showModal();
  btnClose.focus({ preventScroll: true });

  document.body.style.overflow = 'hidden';
};
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- SVG output from mermaid renderer -->
  <div
    :class="props.class"
    role="button"
    tabindex="0"
    :aria-label="LABELS.trigger"
    @click="openZoom"
    @keydown="onTriggerKeydown"
    v-html="svg"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
