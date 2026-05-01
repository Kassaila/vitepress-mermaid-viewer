# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-05-01

### Added

#### Viewer

- Download SVG button in the fullscreen viewer — downloads the rendered diagram as
  `mermaid-<id>.svg`
- Download PNG button in the fullscreen viewer — renders the diagram to a 2x HiDPI canvas (capped at
  4096 px on the longest side) and downloads `mermaid-<id>.png`
- `download` option on `MermaidPlugin` — show/hide the Download SVG button (default: `true`)
- `downloadPng` option on `MermaidPlugin` — show/hide the Download PNG button (default: `true`)
- Shimmer skeleton placeholder shown between Suspense resolve and first `mermaid.render()` (and as
  the Suspense fallback) — replaces the empty stylized "click-target" box that previously read as a
  broken/clickable diagram; the loading container has no `cursor: zoom-in` and no `role="button"`
- Error state in `<Mermaid>` — when initial `mermaid.render()` rejects, the component shows a
  `role="alert"` block with the error message and the diagram source (in `<details>`) instead of
  leaving an empty container
- Re-render failure handling — if rendering fails after a successful first render (e.g. during
  dark-mode theme switch), the previous SVG is restored and the error is logged via `console.warn`,
  so a transient failure does not destroy a working diagram; if the fullscreen viewer is open during
  a re-render failure, it now closes instead of leaving the stale-themed SVG visible
- `prefers-reduced-motion` support — the skeleton shimmer and viewer button transitions are disabled
  when the user has reduced-motion preference set

#### Accessibility

- Keyboard navigation for the fullscreen viewer:
  - `Enter` / `Space` on a focused diagram opens the viewer
  - `+` / `=` zoom in, `-` zoom out, `0` resets, arrow keys pan 40px
- ARIA labeling:
  - `role="button"` + `aria-label` on the diagram trigger
  - `aria-label` on every control (`Zoom in`, `Zoom out`, `Reset zoom`, `Close`) and on the dialog
  - `role="img"` on the SVG cloned into the fullscreen viewer, with any author-provided `aria-label`
    / `aria-labelledby` preserved
  - `aria-live="polite"` on the zoom-level `<output>` so screen readers announce zoom changes
- Focus management — focus moves to the Close button on open and returns to the triggering diagram
  on close; restore is skipped when the previously-focused element has been removed from the DOM
  (e.g. after a route change while the viewer was open)
- VitePress-themed focus rings on the diagram trigger and all zoom controls

#### Documentation

- LLM-friendly content delivery on the VitePress docs site — `/llms.txt` index, `.md` route variants
  of every page, `<link rel="alternate" type="text/markdown">` per page, and a hidden hint div
- **CSS Customization** section in the usage guide documenting `mermaid-view-*` viewer selectors and
  the `--loading` / `--error` state hooks on `<Mermaid>`
- README updates for the keyboard / ARIA / focus-management features and the Download SVG / PNG
  buttons

#### Tests

- Keyboard interaction tests covering trigger open, zoom/pan handlers, aria-live updates, and focus
  restoration

### Changed

- **BREAKING:** Minimum supported Node version is now `>=24.0.0` (was `>=22.0.0`). The CI matrix and
  `package.json#engines` have been bumped accordingly.
- **BREAKING:** `vite` is no longer a peer dependency. `vitepress` peer range has been widened from
  `^1.0.0` to `>=1.0.0` to allow VitePress 2.x. The plugin now imports the `Plugin` type from
  `vitepress` directly, so consumers do not need `vite` installed alongside `vitepress`.
- **BREAKING:** Viewer CSS classes renamed from `mermaid-zoom-*` to `mermaid-view-*`. If you have
  custom CSS that targets `mermaid-zoom-overlay`, `mermaid-zoom-content`, `mermaid-zoom-controls`,
  `mermaid-zoom-btn`, `mermaid-zoom-scale`, or `mermaid-zoom-btn_*`, update those selectors to use
  the `mermaid-view-` prefix.
- Theme switch (dark/light) now shows the skeleton at the locked container height while the diagram
  re-renders, instead of leaving the stale-themed SVG visible on the new background — prevents the
  brief color mismatch and layout jump that happened when the new SVG was swapped in.

### Fixed

- Per-page `mermaidTheme` frontmatter now correctly overrides dark mode (previously dark
  unconditionally won over the per-page setting)
- Image-load watcher inside `<Mermaid>` is scoped to the diagram container instead of scanning every
  `<img>` on the page
- Pinch → single-finger transition in the viewer no longer leaves stale drag baselines — the
  remaining pointer becomes the new drag origin
- `MermaidMarkdown` validates the `class` plugin option and falls back to `'mermaid'` for values
  containing characters that would break out of the HTML attribute
- Built `.d.ts` no longer pulls in `vite` types — `Plugin` is re-exported from `vitepress`, keeping
  consumers' typecheck graph free of the upstream Vite type tree

### Internal

- `MermaidViewer` extracted as a separate component; zoom/pan logic moved into a `useZoomPan`
  composable — keeps `Mermaid.vue` focused on render/lifecycle
- `useZoomPan` composable now manages its own listener lifecycle: `pointermove`/`pointerup`/
  `pointercancel` are attached on first `pointerdown` and detached when no pointers remain;
  defensive `onUnmounted` cleanup covers component teardown mid-drag. The public `cleanup()` return
  is removed
- `useZoomPan` returns a reactive `transform` ref; `MermaidViewer` binds it via `:style` instead of
  mutating `el.style.transform` directly — removes leaky DOM coupling from the composable

## [0.3.0] - 2026-03-28

### Added

- VitePress documentation site published at
  [kassaila.github.io/vitepress-mermaid-viewer](https://kassaila.github.io/vitepress-mermaid-viewer/)
  with Usage guide and live diagram examples
- Test suite with Vitest and happy-dom covering all modules: `mermaid.ts`, `markdown-plugin.ts`,
  `vite-plugin.ts`, `with-mermaid.ts`, and `Mermaid.vue`

### Fixed

- `useData()` called inside `onMounted` lost Vue inject context, causing
  `"vitepress data not properly injected in app"` at runtime — moved back to synchronous `setup()`
  and wrapped `<Mermaid>` in `<ClientOnly>` so the component only executes on the client
- Mermaid diagrams aligned to left edge instead of centered — added flexbox centering to
  `.vp-doc .mermaid`

### Changed

- MutationObserver only re-renders on actual dark/light class toggle, not on every attribute change
- Mermaid library loaded via dynamic `import()` to reduce initial bundle and avoid SSR side-effects
- `mermaid.initialize()` skipped when config is unchanged between renders

## [0.1.1] - 2026-03-28

### Fixed

- SSR build failure caused by top-level `useData()` import — `useData` is now lazy-imported inside
  `onMounted` so the VitePress client API is only accessed in the browser
- GitHub Actions deploy workflow now builds the library before building the documentation site,
  preventing stale or missing `dist/` artifacts during docs deployment

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
