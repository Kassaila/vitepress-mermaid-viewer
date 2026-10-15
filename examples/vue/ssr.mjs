import assert from 'node:assert/strict';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { MermaidViewer } from 'vue-mermaid-viewer';
import { registerExternalDiagrams } from 'vue-mermaid-viewer/mermaid';

assert.equal(typeof globalThis.document, 'undefined');
assert.equal(typeof registerExternalDiagrams, 'function');
const html = await renderToString(
  createSSRApp({
    render: () => h(MermaidViewer, { source: 'graph TD; A-->B' }),
  }),
);

assert.match(html, /aria-busy="true"/);
assert.doesNotMatch(html, /<svg/);
