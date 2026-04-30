<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import { render, init } from './mermaid';
import MermaidViewer from './MermaidViewer.vue';

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
  previousActive?.focus({ preventScroll: true });
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
 */
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
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- SVG output from mermaid renderer -->
  <div
    :class="props.class"
    role="button"
    tabindex="0"
    :aria-label="LABELS.trigger"
    @click="openViewer"
    @keydown="onTriggerKeydown"
    v-html="svg"
  />
  <MermaidViewer
    v-if="isViewerOpen"
    :svg-html="svg!"
    :diagram-id="props.id"
    :download="pluginSettings.download !== false"
    :download-png="pluginSettings.downloadPng !== false"
    @close="closeViewer"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
