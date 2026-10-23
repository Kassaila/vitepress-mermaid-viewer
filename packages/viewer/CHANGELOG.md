# Changelog

## 0.1.0

### Changed

- Support Mermaid `^11.16.1 || ^12` and consumer Node 22.12+, with SSR-safe ESM imports and modern
  Node CJS resolution of the same ESM runtime.
- Use the unscoped `mermaid-viewer` npm name consistently across packages and consumers.

### Added

- Framework-independent DOM viewer extracted from `vue-mermaid-viewer`.
- Source rendering and existing-SVG enhancement with update/open/close/reset/destroy APIs.
- Shared Mermaid queue, dialog, viewport, SVG/PNG export, customization and DOM events.
- Stale-job skipping, per-document dialog coordination and complete local SVG clone ID remapping.
