# Agent manifest

This file provides guidance to AI agent when working with code in this repository.

## Project

Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing.

## Workspace

This repository uses pnpm workspaces with one `pnpm-lock.yaml`. The root is private and owns shared
lint/format/Git tooling. Pin pnpm through the root `packageManager` field; install with
`pnpm install --frozen-lockfile`.

- `packages/vitepress` — the published `vitepress-mermaid-viewer` package, including its current Vue
  viewer, source, tests, build config and changelog.
- `docs` — a private workspace that consumes the package through `workspace:*` and its public
  exports.
- Framework-independent viewer and Vue adapter packages are the next extraction steps.

Use `workspace:^` for future library-to-library dependencies. pnpm pack converts the protocol into
regular semver ranges. Keep build and test dependencies in the package that uses them.

## Commands

```bash
pnpm run build          # Build with tsdown (ESM + CJS + .d.ts)
pnpm run build:dev      # Build with NODE_ENV=development (sourcemaps)
pnpm run dev            # Build in watch mode
pnpm run lint           # ESLint check
pnpm run lint:fix       # ESLint auto-fix
pnpm run format         # Prettier write
pnpm run check:all      # format + lint + typecheck + test + build (full CI check)
pnpm run check:types    # tsc --noEmit
pnpm run test           # Vitest watch mode
pnpm run test:run       # Vitest single run
pnpm run test:coverage  # Vitest with coverage report
pnpm run release:check  # check:all + pnpm pack --dry-run (pre-publish gate)
pnpm run docs:dev       # VitePress dev server
pnpm run docs:build     # Build documentation site
pnpm run docs:preview   # Preview built docs
```

Pre-commit hook runs `lint-staged` (eslint --fix + prettier on staged files). Commit messages are
validated by commitlint with `@commitlint/config-conventional`.

## Architecture

The plugin has three layers that work together:

1. **Markdown plugin** (`packages/vitepress/src/markdown-plugin.ts`) — markdown-it fence renderer
   override. Intercepts ` ```mermaid ` blocks and emits `<Mermaid>` Vue component tags wrapped in
   `<Suspense>`. Also recognizes `mmd` as an alias.

2. **Vite plugin** (`packages/vitepress/src/vite-plugin.ts`) — transforms the VitePress client app
   entry to register the `<Mermaid>` component globally. Serves mermaid configuration via a virtual
   module (`virtual:mermaid-config`).

3. **Vue component** (`packages/vitepress/src/Mermaid.vue`) — renders diagrams client-side using
   mermaid's `render()`. Watches dark/light theme via `MutationObserver` on `<html>` class. Click
   opens a `<dialog>`-based fullscreen viewer with zoom (wheel, pinch, buttons) and pan (pointer
   drag). Supports per-page theme override via `mermaidTheme` frontmatter.

**`withMermaid`** (`packages/vitepress/src/with-mermaid.ts`) is a convenience wrapper that composes
all three layers plus the required `optimizeDeps` and module aliases into a single VitePress config
call.

**`packages/vitepress/src/mermaid.ts`** exposes `init(externalDiagrams)` — dynamically imports
mermaid and registers external diagram definitions. Used by the Vue component to keep mermaid out of
the initial bundle.

Entry point: `packages/vitepress/src/index.ts` — exports `withMermaid`, `MermaidMarkdown`,
`MermaidPlugin`.

## Code Conventions

- CSS uses VitePress CSS custom properties (`--vp-c-*`)
- tsdown bundles with `.vue` files loaded via `unplugin-vue` and `.css` loaded via `@tsdown/css`
- Tests use Vitest with happy-dom, located in `packages/vitepress/__tests__/`
