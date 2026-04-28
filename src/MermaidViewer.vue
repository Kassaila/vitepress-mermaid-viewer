<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';

import { useZoomPan } from './useZoomPan';

/**
 * Props & Emits
 */

const props = withDefaults(
  defineProps<{
    svgHtml: string;
    diagramId: string;
    download?: boolean;
    copy?: boolean;
  }>(),
  {
    download: true,
    copy: true,
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const LABELS = {
  diagram: 'Mermaid diagram',
  dialog: 'Diagram viewer',
  zoomLevel: 'Zoom level',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset zoom',
  close: 'Close',
  download: 'Download SVG',
  copy: 'Copy SVG',
  copied: 'Copied',
  copyFailed: 'Copy failed',
} as const;

const ICONS = {
  close: '\u2715',
  zoomIn: '+',
  zoomOut: '\u2212',
  reset: '\u21BB',
  download: '\u2193',
  copy: '\u2398',
  copyOk: '\u2713',
  copyFail: '\u2717',
} as const;

/**
 * Template refs & composable
 */

const dialogRef = ref<HTMLDialogElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const closeBtnRef = ref<HTMLButtonElement | null>(null);
const copyBtnRef = ref<HTMLButtonElement | null>(null);

const {
  zoomIn,
  zoomOut,
  resetView,
  onPointerDown,
  onWheel,
  handleKeydown,
  scalePercent,
  isDragging,
  cleanup,
} = useZoomPan({ contentRef });

/**
 * Helper functions
 */

const cloneMermaidSvg = (svgHtml: string, _diagramId: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgHtml, 'text/html');
  const svgEl = doc.querySelector('svg');

  if (!svgEl) {
    return svgHtml;
  }

  const origId = svgEl.id;

  if (!svgEl.hasAttribute('role')) {
    svgEl.setAttribute('role', 'img');
  }

  if (!svgEl.hasAttribute('aria-label') && !svgEl.hasAttribute('aria-labelledby')) {
    svgEl.setAttribute('aria-label', LABELS.diagram);
  }

  if (!origId) {
    return svgEl.outerHTML;
  }

  const newId = origId + '-zoom';

  svgEl.id = newId;

  const style = svgEl.querySelector('style');

  if (style?.textContent) {
    style.textContent = style.textContent.replaceAll('#' + origId, '#' + newId);
  }

  return svgEl.outerHTML;
};

const clonedSvgHtml = computed(() => cloneMermaidSvg(props.svgHtml, props.diagramId));

const getSvgSource = (): string => {
  const el = contentRef.value;

  if (!el) {
    return '';
  }

  const svgEl = el.querySelector('svg');

  return svgEl ? svgEl.outerHTML : '';
};

const downloadSvg = (svgSource: string, id: string): void => {
  const blob = new Blob([svgSource], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `mermaid-${id}.svg`;

  a.click();

  URL.revokeObjectURL(url);
};

const copySvg = async (svgSource: string, copyBtn: HTMLButtonElement): Promise<void> => {
  try {
    await navigator.clipboard.writeText(svgSource);
    copyBtn.textContent = ICONS.copyOk;

    copyBtn.setAttribute('aria-label', LABELS.copied);
  } catch {
    copyBtn.textContent = ICONS.copyFail;

    copyBtn.setAttribute('aria-label', LABELS.copyFailed);
  }

  setTimeout(() => {
    copyBtn.textContent = ICONS.copy;

    copyBtn.setAttribute('aria-label', LABELS.copy);
  }, 2000);
};

const onDownload = () => {
  const source = getSvgSource();

  if (source) {
    downloadSvg(source, props.diagramId);
  }
};

const onCopy = () => {
  const source = getSvgSource();
  const btn = copyBtnRef.value;

  if (source && btn) {
    void copySvg(source, btn);
  }
};

/**
 * Lifecycle
 */

const close = () => {
  dialogRef.value?.close();
};

const onDialogClose = () => {
  cleanup();

  document.body.style.overflow = '';

  emit('close');
};

onMounted(() => {
  const dialog = dialogRef.value;

  if (dialog) {
    dialog.showModal();

    document.body.style.overflow = 'hidden';

    closeBtnRef.value?.focus({ preventScroll: true });
  }
});

onBeforeUnmount(() => {
  cleanup();

  document.body.style.overflow = '';
});
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- Cloned SVG output -->
  <Teleport to="body">
    <dialog
      ref="dialogRef"
      class="mermaid-zoom-overlay"
      :aria-label="LABELS.dialog"
      @close="onDialogClose"
      @keydown="handleKeydown"
      @wheel.prevent="onWheel"
    >
      <div class="mermaid-zoom-controls">
        <output class="mermaid-zoom-scale" :aria-label="LABELS.zoomLevel" aria-live="polite">
          {{ scalePercent }}
        </output>
        <button
          ref="closeBtnRef"
          class="mermaid-zoom-btn"
          :title="LABELS.close"
          :aria-label="LABELS.close"
          @click="close"
        >
          {{ ICONS.close }}
        </button>
        <button
          class="mermaid-zoom-btn mermaid-zoom-btn-zoom"
          :title="LABELS.zoomIn"
          :aria-label="LABELS.zoomIn"
          @click="zoomIn"
        >
          {{ ICONS.zoomIn }}
        </button>
        <button
          class="mermaid-zoom-btn mermaid-zoom-btn-zoom"
          :title="LABELS.zoomOut"
          :aria-label="LABELS.zoomOut"
          @click="zoomOut"
        >
          {{ ICONS.zoomOut }}
        </button>
        <button
          class="mermaid-zoom-btn mermaid-zoom-btn-zoom"
          :title="LABELS.reset"
          :aria-label="LABELS.reset"
          @click="resetView"
        >
          {{ ICONS.reset }}
        </button>
        <button
          v-if="download"
          class="mermaid-zoom-btn mermaid-zoom-btn-action"
          :title="LABELS.download"
          :aria-label="LABELS.download"
          @click="onDownload"
        >
          {{ ICONS.download }}
        </button>
        <button
          v-if="copy"
          ref="copyBtnRef"
          class="mermaid-zoom-btn mermaid-zoom-btn-action"
          :title="LABELS.copy"
          :aria-label="LABELS.copy"
          aria-live="polite"
          @click="onCopy"
        >
          {{ ICONS.copy }}
        </button>
      </div>
      <div
        ref="contentRef"
        class="mermaid-zoom-content"
        :class="{ 'is-dragging': isDragging }"
        @pointerdown="onPointerDown"
        v-html="clonedSvgHtml"
      />
    </dialog>
  </Teleport>
  <!-- eslint-enable vue/no-v-html -->
</template>
