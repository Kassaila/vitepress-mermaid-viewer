<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { RenderResult } from 'mermaid';

import { render } from './mermaid';
import ViewerDialog from './ViewerDialog.vue';
import { defaultViewerLabels } from './customization';
import type { MermaidViewerProps, ViewerError, ViewerHandle, ViewerReady } from './types';

import './styles/mermaid.css';
import './styles/zoom.css';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<MermaidViewerProps>(), { appearance: 'light' });
const emit = defineEmits<{
  ready: [result: ViewerReady];
  error: [error: ViewerError];
  open: [];
  close: [];
}>();

const labels = computed(() => ({ ...defaultViewerLabels, ...props.customization?.labels }));
const committed = shallowRef<(RenderResult & { source: string }) | null>(null);
const error = ref<string | null>(null);
const pending = ref(true);
const lockedHeight = ref<number | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const dialogRef = ref<ViewerHandle | null>(null);
const isViewerOpen = ref(false);
let previousActive: HTMLElement | null = null;
let mounted = false;
let revision = 0;
let imageCleanup = () => {};

const close = () => {
  if (!isViewerOpen.value) {
    return;
  }

  isViewerOpen.value = false;
  const focusTarget = previousActive;

  previousActive = null;

  void nextTick(() => {
    if (mounted && !isViewerOpen.value && focusTarget?.isConnected) {
      focusTarget.focus({ preventScroll: true });
    }
  });

  emit('close');
};

const open = () => {
  if (!committed.value || pending.value || isViewerOpen.value || !mounted) {
    return;
  }

  previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  isViewerOpen.value = true;

  emit('open');
};

const reset = () => dialogRef.value?.reset();

defineExpose({ open, close, reset });

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    open();
  }
};

const onActionError = (event: ViewerError) => emit('error', event);

const renderChart = async (refreshImages = true) => {
  const currentRevision = ++revision;
  const source = props.source;
  const config = props.config ?? {};

  imageCleanup();
  close();

  lockedHeight.value = containerRef.value?.offsetHeight || null;
  pending.value = true;

  try {
    const result = await render(source, config);

    if (!mounted || revision !== currentRevision) {
      return;
    }

    committed.value = { ...result, source };
    error.value = null;
    pending.value = false;
    lockedHeight.value = null;
    await nextTick();

    if (!mounted || revision !== currentRevision) {
      return;
    }

    if (containerRef.value) {
      result.bindFunctions?.(containerRef.value);
    }

    emit('ready', { source, svg: result.svg });

    /**
     * HTML-label images can finish loading after Mermaid measures the diagram.
     */
    const images = refreshImages
      ? Array.from(containerRef.value?.querySelectorAll('img') ?? []).filter((img) => !img.complete)
      : [];

    if (images.length) {
      const controller = new AbortController();
      let remaining = images.length;
      const onSettled = () => {
        if (--remaining === 0) {
          controller.abort();

          if (mounted && revision === currentRevision) {
            void renderChart(false);
          }
        }
      };

      imageCleanup = () => controller.abort();

      for (const image of images) {
        image.addEventListener('load', onSettled, { once: true, signal: controller.signal });
        image.addEventListener('error', onSettled, { once: true, signal: controller.signal });
      }
    }
  } catch (cause) {
    if (!mounted || revision !== currentRevision) {
      return;
    }

    error.value = committed.value ? null : cause instanceof Error ? cause.message : String(cause);

    emit('error', { stage: 'render', cause, retainedSvg: Boolean(committed.value) });
  } finally {
    if (mounted && revision === currentRevision) {
      pending.value = false;
      lockedHeight.value = null;
    }
  }
};

/**
 * Watch replacements, not deep mutations of Mermaid configuration.
 */
const stopWatching = watch([() => props.source, () => props.config], () => {
  if (mounted) {
    void renderChart();
  }
});

onMounted(() => {
  mounted = true;
  void renderChart();
});

onBeforeUnmount(() => {
  mounted = false;
  revision++;
  stopWatching();
  imageCleanup();

  previousActive = null;
});
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- SVG output from Mermaid renderer -->
  <div
    v-if="error"
    v-bind="$attrs"
    class="mv-diagram mv-diagram--error"
    :data-mv-appearance="appearance"
    :style="customization?.css"
    role="alert"
    :aria-label="labels.error"
  >
    <p>{{ labels.error }}: {{ error }}</p>
    <details>
      <summary>{{ labels.errorSource }}</summary>
      <pre>{{ source }}</pre>
    </details>
  </div>
  <div
    v-else-if="pending || !committed"
    v-bind="$attrs"
    class="mv-diagram mv-diagram--loading"
    :data-mv-appearance="appearance"
    :style="[customization?.css, lockedHeight !== null ? { minHeight: `${lockedHeight}px` } : {}]"
    aria-busy="true"
    :aria-label="labels.loading"
  />
  <figure
    v-else
    ref="containerRef"
    v-bind="$attrs"
    class="mv-diagram"
    :data-mv-appearance="appearance"
    :style="customization?.css"
    role="button"
    tabindex="0"
    :aria-label="labels.trigger"
    @click="open"
    @keydown="onTriggerKeydown"
    v-html="committed.svg"
  />
  <ViewerDialog
    v-if="isViewerOpen && committed"
    ref="dialogRef"
    :svg-html="committed.svg"
    :diagram-id="id || 'diagram'"
    :code="committed.source"
    :download="controls?.svg !== false"
    :download-png="controls?.png !== false"
    :copy-source="controls?.copySource !== false"
    :appearance="appearance"
    :customization="customization"
    @close="close"
    @error="onActionError"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
