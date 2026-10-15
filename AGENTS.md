# Agent manifest

This file provides guidance to AI agent when working with code in this repository.

## Project

Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing.

## Workspace

This repository uses pnpm workspaces with one `pnpm-lock.yaml`. The root is private and owns shared
lint/format/Git tooling. Pin pnpm through the root `packageManager` field; install with
`pnpm install --frozen-lockfile`.

- `packages/vue` (`vue-mermaid-viewer`) — standalone Vue viewer, Mermaid engine, dialog/viewport,
  SVG/export and typed customization (`css` tokens and JS labels); no VitePress imports or CSS
  variables.
- `packages/vitepress` — published `vitepress-mermaid-viewer` package: Markdown/Vite plugins and a
  thin Vue wrapper for VitePress configuration, frontmatter and theme.
- `docs` — a private workspace that consumes the package through `workspace:*` and its public
  exports.
- `examples/vue` — private ordinary Vue/Vite consumer, including SSR and public-type checks.
- Next, extract the framework-independent viewer from the Vue implementation.

Use `workspace:^` for future library-to-library dependencies. pnpm pack converts the protocol into
regular semver ranges. Keep build and test dependencies in the package that uses them. Until
independent releases are configured, VitePress bundles the Vue workspace implementation; its
`workspace:^` dependency is build-time only. Build packages before cross-package type checks.

Before independent releases, move `vue-mermaid-viewer` to VitePress `dependencies`, remove its
`alwaysBundle` rule and publish Vue before VitePress (viewer → Vue → VitePress after core
extraction). These changes must land together, with packed-consumer checks for types/CSS/SSR and
ESM/CJS compatibility. The release transition checklist is in `docs/plan.md`.

## Commands

```bash
pnpm run build          # Build with tsdown (ESM + CJS + .d.ts)
pnpm run build:dev      # Build with NODE_ENV=development (sourcemaps)
pnpm run dev            # Build in watch mode
pnpm run lint           # ESLint check
pnpm run lint:fix       # ESLint auto-fix
pnpm run format         # Prettier write
pnpm run check:all      # format + build + lint + typecheck + test (full CI check)
pnpm run check:types    # tsc --noEmit
pnpm run test           # Vitest watch mode
pnpm run test:run       # Vitest single run
pnpm run test:coverage  # Vitest with coverage report
pnpm run release:check  # check:all + SSR imports + package dry runs (pre-publish gate)
pnpm run docs:dev       # VitePress dev server
pnpm run docs:build     # Build documentation site
pnpm run docs:preview   # Preview built docs
pnpm run example:vue    # Standalone Vue/Vite example (build packages first)
pnpm run check:examples # Consumer types + SSR + production build
```

Pre-commit hook runs `lint-staged` (eslint --fix + prettier on staged files). Commit messages are
validated by commitlint with `@commitlint/config-conventional`.

## Architecture

The workspace separates these responsibilities:

1. **Markdown plugin** (`packages/vitepress/src/markdown-plugin.ts`) — markdown-it fence renderer
   override. Intercepts ` ```mermaid ` blocks and emits `<Mermaid>` Vue component tags wrapped in
   `<Suspense>`. Also recognizes `mmd` as an alias.

2. **Vite plugin** (`packages/vitepress/src/vite-plugin.ts`) — transforms the VitePress client app
   entry to register the `<Mermaid>` component globally. Serves mermaid configuration via a virtual
   module (`virtual:mermaid-config`).

3. **VitePress Vue wrapper** (`packages/vitepress/src/Mermaid.vue`) — decodes legacy `graph`, reads
   `useData()` frontmatter/dark mode and virtual settings, then passes source/config/customization
   to `packages/vue`. Page `mermaidTheme` overrides dark mode and site theme.

4. **Standalone Vue viewer** (`packages/vue/src/MermaidViewer.vue`) — raw source and explicit props,
   reactive rendering, loading/error states, revision guards and fullscreen dialog.
   `ViewerDialog.vue` and `useZoomPan.ts` own controls and viewport. Mermaid configuration/render
   operations are serialized in `packages/vue/src/mermaid.ts` and clean their temporary rendering
   containers.

**`withMermaid`** (`packages/vitepress/src/with-mermaid.ts`) is a convenience wrapper that composes
the Markdown/Vite plugins plus the required `optimizeDeps` and module aliases into a single
VitePress config call.

**Customization:** `packages/vue/src/customization.ts` defines `ViewerCustomization`, component
`--mv-*` CSS tokens and default JS labels. VitePress mapping lives in
`packages/vitepress/src/styles/vitepress.css`. Application overrides live in
`docs/.vitepress/mermaid-viewer.ts`; instance overrides reach the teleported dialog too.

Entry point: `packages/vitepress/src/index.ts` — exports `withMermaid`, `MermaidMarkdown`,
`MermaidPlugin`.

## Code Conventions

- Use `packages/vitepress` as the structural reference for library packages. Follow the package
  layout, manifest field/script order and file naming rules in `CONTRIBUTING.md` (Package
  conventions).
- Each library owns `src/`, `__tests__/`, build/type/test configs, README, CHANGELOG and LICENSE.
  Dependency names are alphabetized; conditional export key order is preserved.
- Shared CSS uses component tokens (`--mv-*`); only the VitePress mapping uses `--vp-c-*`
- tsdown bundles with `.vue` files loaded via `unplugin-vue` and `.css` loaded via `@tsdown/css`
- Tests use Vitest with happy-dom in each package's `__tests__/` directory
