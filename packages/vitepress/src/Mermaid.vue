<script setup lang="ts">
import { computed } from 'vue';
import type { MermaidConfig } from 'mermaid';
import { MermaidViewer } from 'vue-mermaid-viewer';

import './styles/vitepress.css';
import 'vue-mermaid-viewer/style.css';

const props = withDefaults(defineProps<{ graph: string; id: string; class?: string }>(), {
  class: 'mermaid',
});

/**
 * The packaged client component is also imported by VitePress's SSR entry. Keep platform/virtual
 * imports in async setup so Node can import the module without resolving browser-only modules.
 */
const { useData } = await import('vitepress');
const { isDark, frontmatter } = useData();
const { default: settings } = await import('virtual:mermaid-config');
const source = computed(() => decodeURIComponent(props.graph));
const config = computed(() => {
  const { download: _download, downloadPng: _downloadPng, viewer: _viewer, ...mermaid } = settings;
  const pageTheme: unknown = frontmatter.value.mermaidTheme;

  return {
    ...mermaid,
    ...(isDark.value ? { theme: 'dark' as const } : {}),
    ...(typeof pageTheme === 'string' && pageTheme
      ? { theme: pageTheme as MermaidConfig['theme'] }
      : {}),
  };
});
</script>

<template>
  <MermaidViewer
    :id="id"
    :class="props.class"
    :source="source"
    :config="config"
    :appearance="isDark ? 'dark' : 'light'"
    :customization="settings.viewer"
    :controls="{ svg: settings.download, png: settings.downloadPng }"
  />
</template>
