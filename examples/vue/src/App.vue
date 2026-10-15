<script setup lang="ts">
import { computed, ref } from 'vue';
import { MermaidViewer } from 'vue-mermaid-viewer';
import { viewerCustomization } from './mermaid-viewer';

const dark = ref(false);
const source = ref('graph TD; A[Independent Vue package] --> B[Fullscreen viewer]');
const config = computed(() => ({ theme: dark.value ? ('dark' as const) : ('default' as const) }));
</script>

<template>
  <main>
    <h1>Mermaid Viewer in Vue</h1>
    <label>
      <input v-model="dark" type="checkbox" />
      Dark appearance
    </label>
    <textarea v-model="source" aria-label="Mermaid source" rows="4" />
    <MermaidViewer
      :source="source"
      :config="config"
      :appearance="dark ? 'dark' : 'light'"
      :customization="viewerCustomization"
    />
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
}
main {
  max-width: 64rem;
  margin: 2rem auto;
  padding: 1rem;
}
textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin: 1rem 0;
}
</style>
