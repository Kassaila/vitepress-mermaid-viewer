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

### Priority 1 — Features

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

### Priority 2 — Testing

#### Interaction tests

Rendering, theme observer, keyboard shortcuts, aria-live output, and focus restoration are covered.
Pointer/wheel-path math still has no coverage:

- Mouse wheel zoom — cursor-centered math (`panX` / `panY` offset by `cx * (factor - 1)`)
- Pinch gesture — scale clamped to `[0.25, 5]` via two-pointer distance ratio
- Pointer drag pan — `panX` / `panY` update on `pointermove` while `isDragging`, cleanup on
  `pointerup` / `pointercancel`
