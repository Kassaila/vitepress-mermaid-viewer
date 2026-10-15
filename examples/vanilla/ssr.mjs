import assert from 'node:assert/strict';
import { enhanceSvg, mountViewer } from '@kassaila/mermaid-viewer';
import { registerExternalDiagrams } from '@kassaila/mermaid-viewer/mermaid';

assert.equal(typeof globalThis.document, 'undefined');
assert.equal(typeof globalThis.window, 'undefined');
assert.equal(typeof mountViewer, 'function');
assert.equal(typeof enhanceSvg, 'function');
assert.equal(typeof registerExternalDiagrams, 'function');
