import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

/**
 * VitePress imports its client component while loading the server bundle. This check intentionally
 * uses Node's loader, which cannot resolve Vite virtual modules or browser globals.
 */
assert.equal(typeof globalThis.document, 'undefined');
assert.equal(typeof globalThis.window, 'undefined');

const vue = await import('../packages/vue/dist/index.js');
const viewer = await import('../packages/viewer/dist/index.js');
const viewerSetup = await import('../packages/viewer/dist/mermaid.js');
const setup = await import('../packages/vue/dist/mermaid.js');
const vitepress = await import('../packages/vitepress/dist/index.js');
const component = await import('../packages/vitepress/dist/Mermaid.js');
const require = createRequire(import.meta.url);

assert.ok(vue.MermaidViewer);
assert.equal(typeof viewer.mountViewer, 'function');
assert.equal(typeof viewer.enhanceSvg, 'function');
assert.equal(typeof viewerSetup.registerExternalDiagrams, 'function');
assert.equal(typeof setup.registerExternalDiagrams, 'function');
assert.equal(typeof vitepress.withMermaid, 'function');
assert.ok(component.default);
assert.ok(require('../packages/vitepress/dist/Mermaid.cjs'));
