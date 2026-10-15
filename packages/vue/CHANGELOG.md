# Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Delegate rendering, dialog, viewport, export and customization to the DOM viewer runtime
  dependency.
- Keep a stable outer `.mv-host` for forwarded attributes and the SSR placeholder.
- Reexport customization/events types and Mermaid setup from the shared package.

### Added

- Standalone `vue-mermaid-viewer` package extracted from the VitePress integration, with fullscreen,
  zoom/pan, copy and SVG/PNG export.
- Typed customization object for component CSS tokens and JS labels.
- Reactive source/config updates, render queue, lifecycle cleanup and SSR-safe imports.
- Ordinary Vue/Vite example and packaged-consumer checks.
