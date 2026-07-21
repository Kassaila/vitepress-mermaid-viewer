# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project

Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing. Peer
dependencies: `mermaid >=10`, `vitepress >=1.0.0`.

## Commands

```bash
npm run build          # Build with tsdown (ESM + CJS + .d.ts)
npm run build:dev      # Build with NODE_ENV=development (sourcemaps)
npm run dev            # Build in watch mode
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier write
npm run check:all      # format + lint + typecheck + test + build (full CI check)
npm run check:types    # tsc --noEmit
npm run test           # Vitest watch mode
npm run test:run       # Vitest single run
npm run test:coverage  # Vitest with coverage report
npm run release:check  # check:all + npm pack --dry-run (pre-publish gate)
npm run docs:dev       # VitePress dev server
npm run docs:build     # Build documentation site
npm run docs:preview   # Preview built docs
```

Pre-commit hook runs `lint-staged` (eslint --fix + prettier on staged files). Commit messages are
validated by commitlint with `@commitlint/config-conventional`.

## Architecture

The plugin has three layers that work together:

1. **Markdown plugin** (`src/markdown-plugin.ts`) — markdown-it fence renderer override. Intercepts
   ` ```mermaid ` blocks and emits `<Mermaid>` Vue component tags wrapped in `<Suspense>`. Also
   recognizes `mmd` as an alias.

2. **Vite plugin** (`src/vite-plugin.ts`) — transforms the VitePress client app entry to register
   the `<Mermaid>` component globally. Serves mermaid configuration via a virtual module
   (`virtual:mermaid-config`).

3. **Vue component** (`src/Mermaid.vue`) — renders diagrams client-side using mermaid's `render()`.
   Watches dark/light theme via `MutationObserver` on `<html>` class. Click opens a `<dialog>`-based
   fullscreen viewer with zoom (wheel, pinch, buttons) and pan (pointer drag). Supports per-page
   theme override via `mermaidTheme` frontmatter.

**`withMermaid`** (`src/with-mermaid.ts`) is a convenience wrapper that composes all three layers
plus the required `optimizeDeps` and module aliases into a single VitePress config call.

**`src/mermaid.ts`** exposes `init(externalDiagrams)` — dynamically imports mermaid and registers
external diagram definitions. Used by the Vue component to keep mermaid out of the initial bundle.

Entry point: `src/index.ts` — exports `withMermaid`, `MermaidMarkdown`, `MermaidPlugin`.

## Code Conventions

- CSS uses VitePress CSS custom properties (`--vp-c-*`)
- tsdown bundles with `.vue` files loaded via `unplugin-vue` and `.css` loaded via `@tsdown/css`
- Tests use Vitest with happy-dom, located in `__tests__/`
