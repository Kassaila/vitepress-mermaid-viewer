<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';

import { useZoomPan } from './useZoomPan';
import { cloneMermaidSvg, getSvgSource } from './helpers/svg';
import { downloadFileSvg, downloadFilePng } from './helpers/export';
import { logError } from './helpers/logger';

/**
 * Props & Emits
 */

const props = withDefaults(
  defineProps<{
    svgHtml: string;
    diagramId: string;
    code?: string;
    download?: boolean;
    downloadPng?: boolean;
  }>(),
  {
    code: '',
    download: true,
    downloadPng: true,
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const LABELS = {
  dialog: 'Diagram viewer',
  zoomLevel: 'Zoom level',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset zoom',
  close: 'Close',
  download: 'Download SVG',
  downloadPng: 'Download PNG',
  copyCode: 'Copy diagram source',
  copied: 'Copied!',
} as const;

const ICONS = {
  close: '\u2715',
  zoomIn: '+',
  zoomOut: '\u2212',
  reset: '\u21BB',
  download: 'SVG',
  downloadPng: 'PNG',
  copyCode: '\u2398',
  copied: '\u2713',
} as const;

/**
 * Template refs & composable
 */

const dialogRef = ref<HTMLDialogElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const closeBtnRef = ref<HTMLButtonElement | null>(null);

const {
  zoomIn,
  zoomOut,
  resetView,
  onPointerDown,
  onWheel,
  handleKeydown,
  scalePercent,
  isDragging,
  transform,
} = useZoomPan({ contentRef });

/**
 * Computed & handlers
 */

const clonedSvgHtml = computed(() => cloneMermaidSvg(props.svgHtml));

const onDownload = () => {
  const source = getSvgSource(contentRef.value);

  if (source) {
    downloadFileSvg(source, props.diagramId);
  }
};

let pngExporting = false;

const onDownloadPng = () => {
  if (pngExporting) {
    return;
  }

  const source = getSvgSource(contentRef.value);

  if (source) {
    pngExporting = true;

    downloadFilePng(source, props.diagramId, () => {
      pngExporting = false;
    });
  }
};

const isCopied = ref(false);
let copyTimeout: ReturnType<typeof setTimeout> | null = null;

const onCopyCode = async () => {
  if (!props.code) {
    return;
  }

  try {
    await navigator.clipboard.writeText(props.code);

    isCopied.value = true;

    if (copyTimeout) {
      clearTimeout(copyTimeout);
    }

    copyTimeout = setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (e) {
    logError('Failed to copy diagram source code:', e);
  }
};

/**
 * Lifecycle
 */

const close = () => {
  dialogRef.value?.close();
};

const onDialogClose = () => {
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
  if (copyTimeout) {
    clearTimeout(copyTimeout);
  }

  document.body.style.overflow = '';
});
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- Cloned SVG output -->
  <Teleport to="body">
    <dialog
      ref="dialogRef"
      class="mermaid-view-overlay"
      :aria-label="LABELS.dialog"
      @close="onDialogClose"
      @keydown="handleKeydown"
      @wheel="onWheel"
    >
      <aside class="mermaid-view-controls">
        <output class="mermaid-view-scale" :aria-label="LABELS.zoomLevel" aria-live="polite">
          {{ scalePercent }}
        </output>
        <button
          ref="closeBtnRef"
          class="mermaid-view-btn mermaid-view-btn_close"
          :title="LABELS.close"
          :aria-label="LABELS.close"
          @click="close"
        >
          {{ ICONS.close }}
        </button>
        <button
          class="mermaid-view-btn mermaid-view-btn_zoom"
          :title="LABELS.zoomIn"
          :aria-label="LABELS.zoomIn"
          @click="zoomIn"
        >
          {{ ICONS.zoomIn }}
        </button>
        <button
          class="mermaid-view-btn mermaid-view-btn_zoom"
          :title="LABELS.zoomOut"
          :aria-label="LABELS.zoomOut"
          @click="zoomOut"
        >
          {{ ICONS.zoomOut }}
        </button>
        <button
          class="mermaid-view-btn mermaid-view-btn_zoom"
          :title="LABELS.reset"
          :aria-label="LABELS.reset"
          @click="resetView"
        >
          {{ ICONS.reset }}
        </button>
        <button
          v-if="code"
          class="mermaid-view-btn mermaid-view-btn_download"
          :class="{ 'mermaid-view-btn--copied': isCopied }"
          :title="isCopied ? LABELS.copied : LABELS.copyCode"
          :aria-label="isCopied ? LABELS.copied : LABELS.copyCode"
          @click="onCopyCode"
        >
          {{ isCopied ? ICONS.copied : ICONS.copyCode }}
        </button>
        <button
          v-if="download"
          class="mermaid-view-btn mermaid-view-btn_download mermaid-view-btn_text"
          :title="LABELS.download"
          :aria-label="LABELS.download"
          @click="onDownload"
        >
          {{ ICONS.download }}
        </button>
        <button
          v-if="downloadPng"
          class="mermaid-view-btn mermaid-view-btn_download mermaid-view-btn_text"
          :title="LABELS.downloadPng"
          :aria-label="LABELS.downloadPng"
          @click="onDownloadPng"
        >
          {{ ICONS.downloadPng }}
        </button>
      </aside>
      <figure
        ref="contentRef"
        class="mermaid-view-content"
        :class="{ 'mermaid-view-content--dragging': isDragging }"
        :style="{ transform }"
        @pointerdown="onPointerDown"
        v-html="clonedSvgHtml"
      />
    </dialog>
  </Teleport>
  <!-- eslint-enable vue/no-v-html -->
</template>
