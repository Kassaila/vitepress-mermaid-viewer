<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { render, init } from './mermaid';
import MermaidViewer from './MermaidViewer.vue';
import type { MermaidPluginOptions } from './vite-plugin';

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
  loading: 'Loading diagram',
  error: 'Failed to render diagram',
  errorSource: 'Diagram source',
} as const;

const { useData } = await import('vitepress');
const { page } = useData();

type PluginSettings = MermaidPluginOptions & { externalDiagrams?: unknown[] };

const pluginSettings = ref<PluginSettings>({
  securityLevel: 'loose',
  startOnLoad: false,
  externalDiagrams: [],
  download: true,
  downloadPng: true,
});

const svg = ref<string | null>(null);
const error = ref<string | null>(null);
const mermaidPageTheme = ref('');
const isRerendering = ref(false);
const lockedHeight = ref<number | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let mut: MutationObserver | null = null;

const loadingClass = computed(() => `${props.class} ${props.class}--loading`);
const errorClass = computed(() => `${props.class} ${props.class}--error`);
const decodedGraph = computed(() => decodeURIComponent(props.graph));
const skeletonStyle = computed(() =>
  lockedHeight.value !== null ? { minHeight: `${lockedHeight.value}px` } : undefined,
);

/**
 * Viewer state
 */
const isViewerOpen = ref(false);
let previousActive: HTMLElement | null = null;

const openViewer = () => {
  previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  isViewerOpen.value = true;
};

const closeViewer = () => {
  isViewerOpen.value = false;

  if (previousActive?.isConnected) {
    previousActive.focus({ preventScroll: true });
  }
};

const onTriggerKeydown = (ev: KeyboardEvent) => {
  if (ev.key !== 'Enter' && ev.key !== ' ') {
    return;
  }

  ev.preventDefault();
  openViewer();
};

/**
 * Diagram rendering
 *
 * - Re-render (theme switch): hide old SVG and show skeleton at the locked
 *   container height so the layout stays stable and the user does not see
 *   stale-themed colors on the new theme background.
 * - Initial failure: error state replaces skeleton.
 * - Re-render failure: keep last good SVG, log to console.
 */
const renderChart = async () => {
  const hasDarkClass = document.documentElement.classList.contains('dark');
  const mermaidConfig = {
    ...pluginSettings.value,
  };

  if (hasDarkClass) {
    mermaidConfig.theme = 'dark';
  }

  if (mermaidPageTheme.value) {
    mermaidConfig.theme = mermaidPageTheme.value;
  }

  if (svg.value && containerRef.value) {
    lockedHeight.value = containerRef.value.offsetHeight || null;
    isRerendering.value = true;
  }

  try {
    const svgCode = await render(props.id, decodedGraph.value, mermaidConfig);
    const salt = Math.random().toString(36).substring(7);

    svg.value = `${svgCode} <span style="display: none">${salt}</span>`;
    error.value = null;
  } catch (e) {
    if (svg.value) {
      console.warn('[vitepress-mermaid-viewer] re-render failed, keeping previous diagram:', e);

      if (isViewerOpen.value) {
        closeViewer();
      }
    } else {
      error.value = e instanceof Error ? e.message : String(e);
    }
  } finally {
    isRerendering.value = false;
    lockedHeight.value = null;
  }
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

  const hasImages = (/<img([\w\W]+?)>/.exec(decodedGraph.value)?.length ?? 0) > 0;

  if (hasImages) {
    setTimeout(() => {
      const container = containerRef.value;

      if (!container) {
        return;
      }

      const imgs = Array.from(container.querySelectorAll('img'));

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
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- SVG output from mermaid renderer -->
  <div v-if="error" :class="errorClass" role="alert" :aria-label="LABELS.error">
    <p>{{ LABELS.error }}: {{ error }}</p>
    <details>
      <summary>{{ LABELS.errorSource }}</summary>
      <pre>{{ decodedGraph }}</pre>
    </details>
  </div>
  <div
    v-else-if="!svg || isRerendering"
    :class="loadingClass"
    aria-busy="true"
    :aria-label="LABELS.loading"
    :style="skeletonStyle"
  />
  <div
    v-else
    ref="containerRef"
    :class="props.class"
    role="button"
    tabindex="0"
    :aria-label="LABELS.trigger"
    @click="openViewer"
    @keydown="onTriggerKeydown"
    v-html="svg"
  />
  <MermaidViewer
    v-if="isViewerOpen && svg"
    :svg-html="svg"
    :diagram-id="props.id"
    :download="pluginSettings.download !== false"
    :download-png="pluginSettings.downloadPng !== false"
    @close="closeViewer"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
