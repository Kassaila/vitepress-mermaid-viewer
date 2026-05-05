<script setup lang="ts">
import './root.css';
import './hero-fullscreen.css';
import './llm-hint.css';

import { useData } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import type { DefaultTheme as VPDefaultTheme } from 'vitepress/theme';
import { computed } from 'vue';

const { Layout } = DefaultTheme;
const { theme, page } = useData<VPDefaultTheme.Config & { siteUrl?: string }>();

const mdUrl = computed(() => `${theme.value.siteUrl ?? ''}${page.value.relativePath}`);
</script>

<template>
  <div class="llm-md-hint" aria-hidden="true">
    {{
      `A Markdown version of this page is available at ${mdUrl} — optimized for AI and LLM tools.`
    }}
  </div>
  <Layout />
</template>
