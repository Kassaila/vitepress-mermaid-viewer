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

### Documentation

- [x] `README.md` — features, install, quick start (wrapper + manual), viewer controls, API
- [x] VitePress docs site published at
      [kassaila.github.io/vitepress-mermaid-viewer](https://kassaila.github.io/vitepress-mermaid-viewer/)
- [x] `docs/guide/usage.md`, `docs/guide/examples.md` with live diagrams
- [x] `CHANGELOG.md` — Keep a Changelog format, SemVer
- [x] `CONTRIBUTING.md` — contributor guide
- [x] `CLAUDE.md` — architecture notes for AI-assisted work

---

## TODO

### Priority 1 — UX & Accessibility

#### Fullscreen dialog a11y

`<dialog>` viewer is keyboard-reachable but lacks proper focus management and ARIA labeling.

**Implementation:**

- Focus trap inside open dialog; restore focus to the triggering diagram on close
- `aria-label` on each control button (`Zoom in`, `Zoom out`, `Reset`, `Close`)
- `role="img"` + `aria-label` on the rendered diagram with author-provided alt text
- Announce zoom changes via `aria-live="polite"` on the scale `<output>`
- Visible focus rings (VitePress-themed) on all controls

#### Keyboard zoom & pan

Currently controls require mouse/touch. Add keyboard parity.

- `+` / `−` to zoom (cursor-centered falls back to viewport center)
- Arrow keys to pan
- `0` to reset
- Document shortcuts in `guide/usage.md`

---

### Priority 2 — Features

#### Copy & download

- Download button → save rendered SVG as `.svg`
- Copy-to-clipboard button → copy SVG source
- Optional `download` / `copy` flags in `MermaidPlugin` options to hide if unwanted

#### External diagrams

`init(externalDiagrams)` already accepts a list, but there's no public config path.

- Expose `externalDiagrams` in `mermaid` config passed to `withMermaid` / `MermaidPlugin`
- Example in docs (e.g. `@mermaid-js/mermaid-zenuml`)

#### Error state UI

When mermaid fails to parse, the component renders nothing. Render a fallback:

- Show the raw source in a `<pre>` with a "Diagram failed to render" banner
- Link to mermaid live editor with prefilled source
- Dev-only: console error with diagram id

#### Custom viewer slots

Let consumers override the controls panel without forking the component.

- `<template #controls>` slot with the zoom API exposed via `defineExpose`
- Document the contract in `guide/usage.md`

---

### Priority 3 — Testing

#### Interaction tests

Current tests cover rendering and theme observer. The `openZoom()` logic in `Mermaid.vue` (~200
lines) is untested. Add coverage for:

- Fullscreen open/close — click diagram → `<dialog>` appears; `Escape` / `✕` → cleanup removes
  document-level `pointermove`/`pointerup` listeners and restores `document.body.style.overflow`
- Zoom math — mouse wheel is cursor-centered; pinch clamps scale to `[0.25, 5]`
- Pan drag — `panX` / `panY` update on `pointermove` while `isDragging`
- Reset — `scale=1, panX=0, panY=0`
- Theme switch re-render — MutationObserver fires `renderChart()` only on actual dark class toggle
