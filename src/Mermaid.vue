<script setup lang="ts">
import { onMounted, onUnmounted, ref, toRaw } from 'vue';
import { useData } from 'vitepress';

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

const pluginSettings = ref({
  securityLevel: 'loose',
  startOnLoad: false,
  externalDiagrams: [],
});

const { page } = useData();
const { frontmatter } = toRaw(page.value);
const mermaidPageTheme = frontmatter.mermaidTheme || '';

const svg = ref<string | null>(null);
let mut: MutationObserver | null = null;

const renderChart = async () => {
  const hasDarkClass = document.documentElement.classList.contains('dark');
  const mermaidConfig = {
    ...pluginSettings.value,
  };

  if (mermaidPageTheme) {
    mermaidConfig.theme = mermaidPageTheme;
  }

  if (hasDarkClass) {
    mermaidConfig.theme = 'dark';
  }

  const svgCode = await render(props.id, decodeURIComponent(props.graph), mermaidConfig);

  const salt = Math.random().toString(36).substring(7);

  svg.value = `${svgCode} <span style="display: none">${salt}</span>`;
};

onMounted(async () => {
  await init(pluginSettings.value.externalDiagrams);

  const settings = await import('virtual:mermaid-config');

  if (settings?.default) {
    pluginSettings.value = settings.default;
  }

  mut = new MutationObserver(async () => await renderChart());

  mut.observe(document.documentElement, { attributes: true });
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

const createBtn = (text: string, title: string, className?: string): HTMLButtonElement => {
  const btn = document.createElement('button');

  btn.className = className || 'mermaid-zoom-btn';
  btn.textContent = text;
  btn.title = title;

  return btn;
};

const openZoom = (e: MouseEvent) => {
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

  const dialog = document.createElement('dialog');

  dialog.className = 'mermaid-zoom-overlay';

  const content = document.createElement('div');

  content.className = 'mermaid-zoom-content';

  content.appendChild(cloneMermaidSvg(svgEl));

  const btnClose = createBtn('\u2715', 'Close');
  const btnZoomIn = createBtn('+', 'Zoom in');
  const btnZoomOut = createBtn('\u2212', 'Zoom out');
  const btnReset = createBtn('\u21BB', 'Reset zoom');

  const zoomGroup = document.createElement('div');

  zoomGroup.className = 'mermaid-zoom-group';

  zoomGroup.append(btnZoomIn, btnZoomOut, btnReset);

  const controls = document.createElement('div');

  controls.className = 'mermaid-zoom-controls';

  controls.append(btnClose, zoomGroup);

  dialog.append(controls, content);

  const applyTransform = () => {
    content.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
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

    content.classList.remove('is-dragging');
  };

  const cleanup = () => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    dialog.remove();

    document.body.style.overflow = '';
  };

  dialog.addEventListener('close', cleanup);

  btnZoomIn.addEventListener('click', (ev) => {
    ev.stopPropagation();

    scale = Math.min(5, scale + 0.25);

    applyTransform();
  });

  btnZoomOut.addEventListener('click', (ev) => {
    ev.stopPropagation();

    scale = Math.max(0.25, scale - 0.25);

    applyTransform();
  });

  btnReset.addEventListener('click', (ev) => {
    ev.stopPropagation();

    scale = 1;
    panX = 0;
    panY = 0;

    applyTransform();
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

      content.classList.remove('is-dragging');

      pinchStartDist = getPointerDist();
      pinchStartScale = scale;

      return;
    }

    isDragging = true;
    startX = ev.clientX;
    startY = ev.clientY;
    startPanX = panX;
    startPanY = panY;

    content.classList.add('is-dragging');
    ev.preventDefault();
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

  document.body.style.overflow = 'hidden';
};
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- SVG output from mermaid renderer -->
  <div :class="props.class" @click="openZoom" v-html="svg" />
</template>
