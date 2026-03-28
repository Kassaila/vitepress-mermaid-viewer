# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-27

### Added

#### Core

- `withMermaid(vitepressConfig)` — convenience wrapper that composes all layers into a single
  VitePress config call
- `MermaidMarkdown` — markdown-it fence renderer override, intercepts ` ```mermaid ` and ` ```mmd `
  blocks, emits `<Mermaid>` Vue component tags wrapped in `<Suspense>`
- `MermaidPlugin` — Vite plugin that registers the `<Mermaid>` component globally and serves mermaid
  configuration via `virtual:mermaid-config`
- Client-side rendering using mermaid's `render()` API
- Dark/light theme support via `MutationObserver` on `<html>` class
- Per-page theme override via `mermaidTheme` frontmatter
- Peer dependencies: `mermaid >=10`, `vitepress >=1.0.0`, `vue ^3.0.0`

#### Interactive Viewer

- Click-to-open fullscreen `<dialog>`-based viewer
- Zoom via mouse wheel, pinch gesture, and `+`/`−` buttons
- Pan via pointer drag
- Reset zoom button
- Scale display (`<output>`) showing current zoom percentage
- Semi-transparent controls panel with CSS grid layout

#### Infrastructure

- TypeScript with `strict: true`, target ES2022, bundler module resolution
- tsdown build producing ESM + CJS + `.d.ts`/`.d.cts`
- Conditional sourcemaps (dev only) and minification (prod only)
- Tree-shaking enabled
- ESLint with flat config and type-aware rules
- Prettier with conventional config
- commitlint with `@commitlint/config-conventional`
- Husky pre-commit hook with lint-staged
- EditorConfig for IDE consistency
- GitHub Actions CI workflow — `check:all` on push/PR to main/release
- GitHub Actions Release workflow — npm publish with provenance on `v*` tags
- Release scripts: `release:check`, `release:publish`, `release:publish:beta`
