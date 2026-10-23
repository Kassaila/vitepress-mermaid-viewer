# Changelog

## 0.1.0

### Changed

- Support Mermaid `^11.16.1 || ^12`, Vue 3.5+ and consumer Node 22.12+, with independent versioning
  and a real `workspace:^` runtime dependency on `mermaid-viewer`.
- Delegate rendering, dialog, viewport, export and customization to the DOM viewer runtime
  dependency.
- Keep a stable empty `.mv-host` for forwarded attributes; mount the DOM viewer directly in
  `onMounted`, with all loading/error/ready states owned by the shared package.
- Reexport customization/events types and Mermaid setup from the shared package.

### Added

- Standalone `vue-mermaid-viewer` package extracted from the VitePress integration, with fullscreen,
  zoom/pan, copy and SVG/PNG export.
- Typed customization object for component CSS tokens and JS labels.
- Reactive source/config updates, render queue, lifecycle cleanup and SSR-safe imports.
- Ordinary Vue/Vite example and packaged-consumer checks.
