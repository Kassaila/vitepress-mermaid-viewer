# vitepress-mermaid-viewer — Development Plan

---

## Package decomposition

The repository will evolve into a pnpm monorepo. This migration takes priority over the feature
wishlist below. First extract a standalone Vue package and keep VitePress as its wrapper. Then extract the
framework-independent viewer from Vue, followed by the other framework/documentation integrations. The VS Code extension targets ordinary Markdown Preview
and follows that first cohort.

- [x] Private workspace root, pnpm 12.9.1 and a single `pnpm-lock.yaml`
- [x] Move the existing plugin and tests to `packages/vitepress`, preserving its npm name and exports
- [x] Private docs workspace consuming the built package through public exports
- [x] Update local commands, Git hooks and CI/release paths for pnpm
- [x] Extract a standalone Vue implementation to `packages/vue` and connect the VitePress wrapper
- [x] Typed customization file/object for component CSS tokens and JS labels; separate VitePress mapping
- [x] Ordinary Vue/Vite consumer with SSR and public types
- [x] Consistent library layout, manifests and script names based on `packages/vitepress`
- [ ] Extract the framework-independent DOM viewer to `packages/viewer`; turn Vue into a thin adapter
- [ ] Add Changesets and independent package releases
- [ ] Add other integrations and the VS Code extension in stages

### Replace temporary Vue bundling before independent releases

VitePress currently bundles the Vue implementation using `alwaysBundle`; `vue-mermaid-viewer` is
therefore a build-time `devDependency`. This is temporary. The final package graph must use a
runtime dependency. Complete the following changes together before releasing independent packages:

- [ ] Move `"vue-mermaid-viewer": "workspace:^"` from `devDependencies` to `dependencies` in
      `packages/vitepress/package.json` and regenerate the pnpm lockfile.
- [ ] Remove `vue-mermaid-viewer` from `alwaysBundle` in `packages/vitepress/tsdown.config.ts`;
      keep the Vue runtime external in the published VitePress build.
- [ ] Configure dependency-order publishing: Vue before VitePress; after extracting the shared
      viewer, viewer before Vue before VitePress. Publish consumers only after their required
      dependency versions are available.
- [ ] Verify packed consumers outside the workspace: runtime dependencies, public types, CSS, SSR
      and existing VitePress ESM/CJS exports. Explicitly check CJS interoperability with the ESM Vue
      package and align framework/Mermaid peer ranges with the supported dependency versions.

## Done

### Infrastructure

- [x] Project structure (`packages/vitepress/src/`, `packages/vitepress/__tests__/`, `docs/`)
- [x] `tsconfig.base.json` + package `tsconfig.json` (strict, ES2022, bundler resolution)
- [x] `packages/vitepress/package.json` — dual ESM + CJS exports, `./Mermaid`, `./style.css`, peer deps (`mermaid >=10`,
      `vitepress >=1.0.0`, `vue ^3.0.0`)
- [x] Build system — tsdown (ESM + CJS + `.d.ts`/`.d.cts`, sourcemaps in dev, minified in prod,
      tree-shaking on)
- [x] `.vue` files loaded via `unplugin-vue`, `.css` via `@tsdown/css`
- [x] ESLint flat config with type-aware rules + `eslint-plugin-kassaila`
- [x] Prettier + EditorConfig
- [x] Husky pre-commit hook with lint-staged (eslint --fix + prettier)
- [x] commitlint with `@commitlint/config-conventional` (`commit-msg` hook)
- [x] LICENSE (MIT)
- [x] CI — GitHub Actions `release:check` + `docs:build` on push/PR to main/release
- [x] Release — GitHub Actions npm publish with provenance on `v*` tags
- [x] Docs deploy — library built before VitePress site

### Source Code

- [x] `packages/vitepress/src/index.ts` — public exports (`withMermaid`, `MermaidMarkdown`, `MermaidPlugin`)
- [x] `packages/vitepress/src/markdown-plugin.ts` — markdown-it fence override for ` ```mermaid ` and ` ```mmd `
- [x] `packages/vitepress/src/vite-plugin.ts` — client-app entry transform + `virtual:mermaid-config`
- [x] `packages/vitepress/src/Mermaid.vue` — wrapper for encoded graph, config, frontmatter and theme
- [x] `packages/vue/src/MermaidViewer.vue` — renderer and loading/error states; `ViewerDialog.vue` owns the fullscreen UI
- [x] `packages/vue/src/mermaid.ts` — lazy Mermaid loading and serialized initialization/rendering
- [x] `packages/vitepress/src/with-mermaid.ts` — one-call config wrapper (markdown + vite + optimizeDeps + aliases)
- [x] `packages/vue/src/styles/` — component styles using `--mv-*` tokens
- [x] `packages/vitepress/src/styles/vitepress.css` — mapping from component tokens to VitePress variables

### Features

- [x] ` ```mermaid ` fence interception + `<Mermaid>` component emission wrapped in `<Suspense>`
- [x] `mmd` fence alias
- [x] Client-side rendering via mermaid `render()`
- [x] Dark/light theme reactivity through VitePress `useData().isDark`
- [x] Per-page theme override via `mermaidTheme` frontmatter
- [x] Mermaid loaded via dynamic `import()` (kept out of initial bundle, SSR-safe)
- [x] Mermaid initialization/rendering serialized across viewer instances to isolate configuration
- [x] `<ClientOnly>` wrapping — avoids SSR `useData()` injection errors
- [x] Fullscreen `<dialog>` viewer — click-to-open
- [x] Zoom — `+` / `−` buttons, mouse wheel (cursor-centered), pinch gesture
- [x] Pan via pointer drag
- [x] Reset zoom button
- [x] Scale `<output>` display (current zoom %)
- [x] Semi-transparent controls panel (CSS grid)
- [x] Close on `Escape` and `✕` button
- [x] Global component auto-registration via Vite plugin
- [x] Diagram centered in `.mv-diagram` (flexbox), with the legacy configurable class preserved
- [x] Download SVG button — saves rendered diagram as `mermaid-<id>.svg`; toggleable via `download`
      option on `MermaidPlugin` (default `true`)
- [x] Download PNG button — renders to 2x HiDPI canvas (capped at 4096 px on the longest side);
      toggleable via `downloadPng` option (default `true`)
- [x] Diagram source code copy button — copies original Mermaid graph code to clipboard in viewer
- [x] XMLSerializer SVG export — keeps void HTML tags like `<br>` self-closing (`<br/>`) in SVG
- [x] Centralized logger — `logWarn` and `logError` with `[mermaid-viewer]` prefix
- [x] Semantic `<figure>` containers in the standalone viewer and fullscreen dialog
- [x] Loading skeleton — shimmer placeholder shown between Suspense resolve and first
      `mermaid.render()`, and during dark/light re-render at the locked container height
- [x] Error state — `role="alert"` block with the error message and the diagram source in
      `<details>` when initial `mermaid.render()` rejects
- [x] Re-render failure recovery — preserves the previous successful SVG/source pair and emits an
      error; a source/config update closes the fullscreen dialog before rendering
- [x] `prefers-reduced-motion` support — disables skeleton shimmer and viewer button transitions

### Accessibility

- [x] Keyboard-reachable diagram trigger — `role="button"`, `tabindex="0"`, opens on `Enter` /
      `Space`
- [x] In-dialog keyboard shortcuts — `+` / `=` zoom in, `-` zoom out, `0` reset, arrow keys pan
- [x] `aria-label` on every control (`Zoom in`, `Zoom out`, `Reset zoom`, `Close`) and on the dialog
- [x] `role="img"` on the rendered SVG; author-provided `aria-label` / `aria-labelledby` preserved
- [x] `aria-live="polite"` on the zoom-level `<output>`
- [x] Focus moves to the Close button on open; returns to the triggering diagram on close
- [x] Visible `:focus-visible` rings (`--mv-accent`, mapped to VitePress theme) on trigger and controls

### Workspace Scripts

- [x] `build`, `build:dev`, `dev` (watch)
- [x] `lint`, `lint:fix`, `check:lint`
- [x] `format`, `format:check`, `check:format`
- [x] `check:types` (`tsc --noEmit`), `check:all`
- [x] `test`, `test:run`, `test:coverage`
- [x] `release:check`, `release:publish`, `release:publish:beta`
- [x] `docs:dev`, `docs:build`, `docs:preview`

### Testing

- [x] Vitest + happy-dom
- [x] Package-local tests for the Vue engine, rendering, dialog, SVG helpers and VitePress adapters/plugins
- [x] `packages/*/__tests__/helpers/` package-local test utilities
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
- [x] `packages/*/CHANGELOG.md` — package-local release notes in Keep a Changelog format
- [x] `CONTRIBUTING.md` — contributor guide
- [x] `CLAUDE.md` — architecture notes for AI-assisted work
- [x] LLM-friendly content delivery — `/llms.txt` index, `.md` route variants of every page,
      `<link rel="alternate" type="text/markdown">`, hidden hint div
- [x] Customization section in usage guide — typed CSS/JS customization object, `--mv-*` tokens and
      separate VitePress theme mapping

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
