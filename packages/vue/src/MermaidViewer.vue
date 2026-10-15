<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { defaultViewerLabels, mountViewer } from '@kassaila/mermaid-viewer';
import type { ViewerHandle as DOMViewerHandle } from '@kassaila/mermaid-viewer';
import type { MermaidViewerProps, ViewerError, ViewerReady } from './types';

import '@kassaila/mermaid-viewer/style.css';

const props = withDefaults(defineProps<MermaidViewerProps>(), {
  appearance: 'light',
  openOnDiagramClick: true,
});
const emit = defineEmits<{
  ready: [result: ViewerReady];
  error: [error: ViewerError];
  open: [];
  close: [];
}>();
const host = ref<HTMLElement | null>(null);
const active = ref(false);
const loadingLabel = computed(
  () => props.customization?.labels?.loading ?? defaultViewerLabels.loading,
);
let instance: DOMViewerHandle | undefined;
let disposed = false;
const controller = new AbortController();

defineExpose({
  open: () => instance?.open(),
  close: () => instance?.close(),
  reset: () => instance?.reset(),
});

/**
 * Core compares source/config identities; UI-only changes do not request a diagram render.
 */
const stopWatching = watch(
  () => ({ ...props }),
  (options) => instance?.update(options),
  { deep: true },
);

onMounted(async () => {
  /**
   * Let Vue remove its SSR/loading placeholder before handing the empty subtree to the runtime.
   */
  active.value = true;
  await nextTick();

  if (disposed || !host.value) return;

  const element = host.value;
  const options = { signal: controller.signal };

  element.addEventListener(
    'mermaid-viewer:ready',
    (event) => emit('ready', (event as CustomEvent<ViewerReady>).detail),
    options,
  );
  element.addEventListener(
    'mermaid-viewer:error',
    (event) => emit('error', (event as CustomEvent<ViewerError>).detail),
    options,
  );
  element.addEventListener('mermaid-viewer:open', () => emit('open'), options);
  element.addEventListener('mermaid-viewer:close', () => emit('close'), options);

  instance = mountViewer(element, { ...props });
});

onBeforeUnmount(() => {
  disposed = true;

  stopWatching();
  controller.abort();
  instance?.destroy();
  instance = undefined;
});
</script>

<template>
  <div ref="host" class="mv-host">
    <div
      v-if="!active"
      class="mv-root mv-diagram mv-diagram--loading"
      :data-mv-appearance="appearance"
      :style="customization?.css"
      aria-busy="true"
      :aria-label="loadingLabel"
    />
  </div>
</template>
