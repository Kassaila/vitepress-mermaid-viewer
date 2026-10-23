# Agent manifest

This file provides guidance to AI agent when working with code in this repository.

## Project

Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing.

## Workspace

This repository uses pnpm workspaces with one `pnpm-lock.yaml`. The root is private and owns shared
lint/format/Git tooling. Pin pnpm through the root `packageManager` field; install with
`pnpm install --frozen-lockfile`.

- `packages/viewer` (`mermaid-viewer`) — framework-independent DOM viewer, Mermaid queue, SVG
  enhancement, dialog/viewport, export and typed customization; no Vue/VitePress imports.
- `packages/vue` (`vue-mermaid-viewer`) — thin Vue lifecycle/props/events adapter with an empty
  host; depends on the viewer through `dependencies: workspace:^`.
- `packages/vitepress` — published `vitepress-mermaid-viewer` package: Markdown/Vite plugins and a
  thin Vue wrapper for VitePress configuration, frontmatter and theme.
- `docs` — a private workspace that consumes the package through `workspace:*` and its public
  exports.
- `examples/vue` — private ordinary Vue/Vite consumer, including SSR and public-type checks.
- `examples/vanilla` — private plain TypeScript/Vite consumer for source and existing-SVG modes.
- Independent versions are managed by Changesets; add other integrations in stages.

Use `workspace:^` for library-to-library runtime dependencies in `dependencies`. pnpm links local
packages during development and converts the protocol into normal semver ranges when packing; local
changes never require a release. Keep build and test dependencies in the package that uses them.
Build packages before cross-package type checks; `pnpm dev` watches all library builds.

Keep the Mermaid peer range `^11.16.1 || ^12` identical in all three public packages. Exact
development pins and CI snapshots are separate from this support contract; CI checks the minimum
version of each supported major. Mermaid is optional only in the DOM viewer package.

The runtime graph is viewer → Vue → VitePress. Keep neighboring package JavaScript external;
`alwaysBundle` is used only for public CSS so each adapter retains a self-contained stylesheet.
Core/Vue ship ESM with default-condition resolution for modern Node; retain the existing VitePress
ESM/CJS exports and validate them on consumer Node 22.12+.

Use `pnpm changeset` for package release notes. `release:version` prepares manifests/changelogs and
the lockfile without publication. `release:check` validates actual tarballs outside the workspace,
including browser hydration and a core consumer without Mermaid. Release publishing is manual, waits
for dependency availability and runs viewer → Vue → VitePress. Preparing or checking a release does
not authorize publication. See `RELEASING.md` and the checklist in `docs/plan.md`.

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
pnpm run changeset      # Record a package change
pnpm run release:status # Review pending version changes
pnpm run release:version # Apply versions/changelogs/lockfile; no publication
pnpm run release:check  # check:all + SSR + isolated tarball/browser consumers; no publication
pnpm run check:packed   # Tarball consumers; requires Playwright Chromium
pnpm run docs:dev       # VitePress dev server
pnpm run docs:build     # Build documentation site
pnpm run docs:preview   # Preview built docs
pnpm run example:vue    # Standalone Vue/Vite example (build packages first)
pnpm run example:vanilla # Plain TypeScript example (build packages first)
pnpm run check:examples # Both consumers: types + SSR + production build
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

4. **Vue adapter** (`packages/vue/src/MermaidViewer.vue`) — stable empty `.mv-host`, props
   forwarding, DOM-event to Vue-event translation, mount/update/destroy lifecycle. Mount the runtime
   directly in `onMounted`; loading/error/ready states belong to the core, with no duplicated Vue
   placeholder. Attributes and custom classes belong to that outer host; the runtime owns the child
   figure.

5. **DOM viewer** (`packages/viewer/src/viewer.ts`) — raw source, render states and revision guards.
   `enhance-svg.ts` accepts trusted platform-owned SVG without loading Mermaid. `dialog.ts` and
   `viewport.ts` own fullscreen UI and interactions. `mermaid.ts` serializes setup/rendering, skips
   stale queued jobs and cleans its staging subtree after settlement. `destroy()` disconnects
   listeners and callbacks synchronously; late render results cannot commit. One dialog per
   Document.

**`withMermaid`** (`packages/vitepress/src/with-mermaid.ts`) is a convenience wrapper that composes
the Markdown/Vite plugins plus the required `optimizeDeps` and module aliases into a single
VitePress config call.

**Customization:** `packages/viewer/src/customization.ts` defines `ViewerCustomization`, component
`--mv-*` CSS tokens and default JS labels. VitePress mapping lives in
`packages/vitepress/src/styles/vitepress.css`. Application overrides live in
`docs/.vitepress/mermaid-viewer.ts`; allowed inherited CSS tokens and instance overrides are copied
to the body-mounted dialog on open/update. Vue reexports the same customization types.

Entry point: `packages/vitepress/src/index.ts` — exports `withMermaid`, `MermaidMarkdown`,
`MermaidPlugin`.

## Code Conventions

- Public npm package names are unscoped: `mermaid-viewer`, `vue-mermaid-viewer` and
  `vitepress-mermaid-viewer`. Do not introduce personal scopes in package names, dependencies,
  imports or examples. Framework integrations follow `<framework>-mermaid-viewer`.
- Use `packages/vitepress` as the structural reference for library packages. Follow the package
  layout, manifest field/script order and file naming rules in `CONTRIBUTING.md` (Package
  conventions).
- Each library owns `src/`, `__tests__/`, build/type/test configs, README, CHANGELOG and LICENSE.
  Dependency names are alphabetized; conditional export key order is preserved.
- Shared CSS uses component tokens (`--mv-*`); only the VitePress mapping uses `--vp-c-*`
- tsdown bundles with `.vue` files loaded via `unplugin-vue` and `.css` loaded via `@tsdown/css`
- Tests use Vitest with happy-dom in each package's `__tests__/` directory
