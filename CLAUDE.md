# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project

VitePress plugin that renders `mermaid` code blocks as interactive diagrams with a fullscreen
zoom/pan viewer. Drop-in replacement for `vitepress-plugin-mermaid`. Peer dependencies:
`mermaid >=10`, `vitepress >=1.0.0`.

## Commands

```bash
npm run build          # Build with tsdown (ESM + CJS + .d.ts)
npm run dev            # Build in watch mode
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier write
npm run check:all      # format + lint + typecheck + build (full CI check)
npm run check:types    # tsc --noEmit
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

Entry point: `src/index.ts` — exports `withMermaid`, `MermaidMarkdown`, `MermaidPlugin`.

## Code Conventions

- CSS uses VitePress CSS custom properties (`--vp-c-*`)
- tsdown bundles with `.vue` files loaded via `unplugin-vue` and `.css` loaded via `@tsdown/css`
- No test framework currently configured
