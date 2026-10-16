<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { mountViewer } from 'mermaid-viewer';
import type { ViewerHandle as DOMViewerHandle } from 'mermaid-viewer';
import type { MermaidViewerProps, ViewerError, ViewerReady } from './types';

import 'mermaid-viewer/style.css';

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
let instance: DOMViewerHandle | undefined;
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

onMounted(() => {
  if (!host.value) return;

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
  stopWatching();
  controller.abort();
  instance?.destroy();
  instance = undefined;
});
</script>

<template>
  <div ref="host" class="mv-host" />
</template>
