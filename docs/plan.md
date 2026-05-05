# vitepress-mermaid-viewer — Development Plan

---

## Done

### Infrastructure

- [x] Project structure (`src/`, `__tests__/`, `docs/`)
- [x] `tsconfig.json` (strict, ES2022, bundler resolution)
- [x] `package.json` — dual ESM + CJS exports, `./Mermaid`, `./style.css`, peer deps (`mermaid >=10`,
      `vitepress ^1.0.0`, `vue ^3.0.0`, optional `vite >=5.0.0`)
- [x] Build system — tsdown (ESM + CJS + `.d.ts`/`.d.cts`, sourcemaps in dev, minified in prod,
      tree-shaking on)
- [x] `.vue` files loaded via `unplugin-vue`, `.css` via `@tsdown/css`
- [x] ESLint flat config with type-aware rules + `eslint-plugin-kassaila`
- [x] Prettier + EditorConfig
- [x] Husky pre-commit hook with lint-staged (eslint --fix + prettier)
- [x] commitlint with `@commitlint/config-conventional` (`commit-msg` hook)
- [x] LICENSE (MIT)
- [x] CI — GitHub Actions `check:all` on push/PR
- [x] Release — GitHub Actions npm publish with provenance on `v*` tags
- [x] Docs deploy — library built before VitePress site

### Source Code

- [x] `src/index.ts` — public exports (`withMermaid`, `MermaidMarkdown`, `MermaidPlugin`)
- [x] `src/markdown-plugin.ts` — markdown-it fence override for ` ```mermaid ` and ` ```mmd `
- [x] `src/vite-plugin.ts` — client-app entry transform + `virtual:mermaid-config`
- [x] `src/Mermaid.vue` — client-side renderer with fullscreen dialog viewer
- [x] `src/mermaid.ts` — dynamic `init(externalDiagrams)` and `render()`
- [x] `src/with-mermaid.ts` — one-call config wrapper (markdown + vite + optimizeDeps + aliases)
- [x] `src/styles/` — scoped CSS using VitePress CSS custom properties (`--vp-c-*`)

### Features

- [x] ` ```mermaid ` fence interception + `<Mermaid>` component emission wrapped in `<Suspense>`
- [x] `mmd` fence alias
- [x] Client-side rendering via mermaid `render()`
- [x] Dark/light theme reactivity via `MutationObserver` on `<html>` class (fires only on actual
      dark class toggle, not every attribute change)
- [x] Per-page theme override via `mermaidTheme` frontmatter
- [x] Mermaid loaded via dynamic `import()` (kept out of initial bundle, SSR-safe)
- [x] `mermaid.initialize()` skipped when config is unchanged between renders
- [x] `<ClientOnly>` wrapping — avoids SSR `useData()` injection errors
- [x] Fullscreen `<dialog>` viewer — click-to-open
- [x] Zoom — `+` / `−` buttons, mouse wheel (cursor-centered), pinch gesture
- [x] Pan via pointer drag
- [x] Reset zoom button
- [x] Scale `<output>` display (current zoom %)
- [x] Semi-transparent controls panel (CSS grid)
- [x] Close on `Escape` and `✕` button
- [x] Global component auto-registration via Vite plugin
- [x] Diagram centered in `.vp-doc .mermaid` (flexbox)
- [x] Download SVG button — saves rendered diagram as `mermaid-<id>.svg`; toggleable via `download`
      option on `MermaidPlugin` (default `true`)
- [x] Download PNG button — renders to 2x HiDPI canvas (capped at 4096 px on the longest side);
      toggleable via `downloadPng` option (default `true`)
- [x] Loading skeleton — shimmer placeholder shown between Suspense resolve and first
      `mermaid.render()`, and during dark/light re-render at the locked container height
- [x] Error state — `role="alert"` block with the error message and the diagram source in
      `<details>` when initial `mermaid.render()` rejects
- [x] Re-render failure recovery — restores the previous SVG and logs `console.warn` if a
      subsequent render fails (e.g. during theme switch); closes the fullscreen viewer if it was
      open during the failure
- [x] `prefers-reduced-motion` support — disables skeleton shimmer and viewer button transitions

### Accessibility

- [x] Keyboard-reachable diagram trigger — `role="button"`, `tabindex="0"`, opens on `Enter` /
      `Space`
- [x] In-dialog keyboard shortcuts — `+` / `=` zoom in, `-` zoom out, `0` reset, arrow keys pan
- [x] `aria-label` on every control (`Zoom in`, `Zoom out`, `Reset zoom`, `Close`) and on the dialog
- [x] `role="img"` on the rendered SVG; author-provided `aria-label` / `aria-labelledby` preserved
- [x] `aria-live="polite"` on the zoom-level `<output>`
- [x] Focus moves to the Close button on open; returns to the triggering diagram on close
- [x] Visible `:focus-visible` rings (VitePress `--vp-c-brand-1`) on trigger and zoom controls

### NPM Scripts

- [x] `build`, `build:dev`, `dev` (watch)
- [x] `lint`, `lint:fix`, `check:lint`
- [x] `format`, `format:check`, `check:format`
- [x] `check:types` (`tsc --noEmit`), `check:all`
- [x] `test`, `test:run`, `test:coverage`
- [x] `release:check`, `release:publish`, `release:publish:beta`
- [x] `docs:dev`, `docs:build`, `docs:preview`

### Testing

- [x] Vitest + happy-dom
- [x] Tests for `mermaid.ts`, `markdown-plugin.ts`, `vite-plugin.ts`, `with-mermaid.ts`, `Mermaid.vue`
- [x] `__tests__/helpers/` shared test utilities
- [x] `@vitest/coverage-v8` configured
- [x] Keyboard interaction tests — trigger open, zoom/pan handlers, aria-live updates, focus
      restoration

### Internal

- [x] `MermaidViewer` extracted as a separate component
- [x] `useZoomPan` composable — owns pointer/wheel/pinch logic and listener lifecycle, returns a
      reactive `transform` ref consumed via `:style`

### Documentation

- [x] `README.md` — features, install, quick start (wrapper + manual), viewer controls, API
- [x] VitePress docs site published at
      [kassaila.github.io/vitepress-mermaid-viewer](https://kassaila.github.io/vitepress-mermaid-viewer/)
- [x] `docs/guide/usage.md`, `docs/guide/examples.md` with live diagrams
- [x] `CHANGELOG.md` — Keep a Changelog format, SemVer
- [x] `CONTRIBUTING.md` — contributor guide
- [x] `CLAUDE.md` — architecture notes for AI-assisted work
- [x] LLM-friendly content delivery — `/llms.txt` index, `.md` route variants of every page,
      `<link rel="alternate" type="text/markdown">`, hidden hint div
- [x] CSS Customization section in usage guide — documents `mermaid-view-*` viewer selectors and
      the `--loading` / `--error` state hooks on `<Mermaid>`

---

## TODO

### Priority 1 — Features

#### Custom viewer slots

Let consumers override the controls panel without forking the component.

- `<template #controls>` slot with the zoom API exposed via `defineExpose`
- Document the contract in `guide/usage.md`

---

### Priority 2 — Testing

#### `useZoomPan` interaction tests

Pointer/wheel-path math has no coverage:

- Mouse wheel zoom — cursor-centered math (`panX` / `panY` offset by `cx * (factor - 1)`)
- Pinch gesture — scale clamped to `[0.25, 5]` via two-pointer distance ratio
- Pointer drag pan — `panX` / `panY` update on `pointermove` while `isDragging`, cleanup on
  `pointerup` / `pointercancel`
