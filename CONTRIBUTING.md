# Contributing

Thanks for your interest in contributing to vitepress-mermaid-viewer!

## Requirements

- Node.js >= 24.0.0 for repository tooling (published consumers support Node 22.12+)
- pnpm 12.9.1 (pinned in the root `packageManager` field)

## Setup

```bash
git clone https://github.com/Kassaila/vitepress-mermaid-viewer.git
cd vitepress-mermaid-viewer
pnpm install --frozen-lockfile
```

## Workspace layout

The root is private and contains shared lint, format and Git tooling. `packages/viewer` owns the
framework-independent DOM implementation and customization contract; `packages/vue` adapts its
lifecycle, props and events. `examples/vanilla` and `examples/vue` verify ordinary Vite consumers.
The VitePress plugin lives in `packages/vitepress` with its own manifest, source, tests, build
config, README, changelog and license. Its npm name and public exports remain
`vitepress-mermaid-viewer`.

`docs` is a private workspace and consumes the built plugin through its public exports. Run
`pnpm run build` before starting or building the docs. Use `pnpm --filter vitepress-mermaid-viewer`
to run a command for the plugin alone, for example:

```bash
pnpm --filter vitepress-mermaid-viewer run test:run
pnpm --dir packages/vitepress pack --dry-run
```

Declare dependencies in the workspace that uses them. Use `workspace:^` in `dependencies` for
library-to-library runtime imports and `workspace:*` for private consumers; pnpm pack rewrites these
to regular versions/ranges. There is one `pnpm-lock.yaml`, and CI installs with `--frozen-lockfile`.
These dependencies link directly to local packages; no npm publication or version bump is needed for
local development. After the initial build, use `pnpm dev` for watch builds and `pnpm docs:dev` or
an example command in a second terminal. Public exports read `dist`, so watch builds are needed to
reflect source changes.

Changesets manages independent package versions. Run `pnpm changeset` for a package change and
`pnpm release:status` to inspect pending releases. `pnpm release:version` prepares versions,
changelogs and the lockfile without publishing. The release workflow runs manually on `main` and
publishes viewer → Vue → VitePress after validation. See [RELEASING.md](./RELEASING.md) for support,
first-publication account checks and retry behavior. Commit/tag pushes do not publish packages.

## Package conventions

Public npm names are unscoped: `mermaid-viewer` for the shared component and
`<framework>-mermaid-viewer` for framework integrations, including `vue-mermaid-viewer` and
`vitepress-mermaid-viewer`. Keep manifests, imports, build rules and examples consistent with these
names; do not add a personal scope.

Use `packages/vitepress` as the structural reference for library packages, including `packages/vue`
and future integrations. Package directories use their role (`packages/vue`, `packages/vitepress`,
`packages/viewer`); npm names live in their manifests.

```text
packages/<role>/
  package.json
  README.md
  CHANGELOG.md
  LICENSE
  tsconfig.json
  tsdown.config.ts
  vitest.config.ts
  src/
    index.ts
    helpers/
    styles/
  __tests__/
    helpers/
```

Create subdirectories when they contain code. Vue components use PascalCase filenames, Vue
composables use `useXxx.ts`, other modules use kebab-case, and tests use `*.test.ts`. Keep package
sources, tests and tooling together; shared repository tooling stays at the root.

Keep the same relative manifest field order across workspaces, using the existing VitePress manifest
as the reference: identity (`name`, `version`, `private`, `description`), module/package settings
(`type`, `packageManager`, `sideEffects`), entry points (`main`, `module`, `types`, `exports`),
published files and metadata, runtime/peer dependencies, scripts, shared-tool settings, then dev
dependencies. Alphabetize dependency names. Preserve conditional export key order.

Library scripts follow `build`, `build:dev`, `dev`, `check:types`, `test`, `test:run`,
`test:coverage`, then release hooks. Use these names consistently; commands and export formats
follow each package's requirements. The root owns aggregate scripts, while private docs/examples
declare only the commands and metadata they use. Libraries ship their own README, changelog and
license; include `CHANGELOG.md` alongside `dist` in `files`.

## Quick Reference

```bash
pnpm run build          # Production build (ESM + CJS + types)
pnpm run build:dev      # Development build (with sourcemaps, no minify)
pnpm run dev            # Build in watch mode
pnpm run lint           # ESLint check
pnpm run lint:fix       # ESLint auto-fix
pnpm run format         # Format code with Prettier
pnpm run check:all      # Full validation (format + build + lint + types + tests)
pnpm exec playwright install chromium # Install the release gate's browser once
pnpm run release:check  # Full validation + SSR + actual tarball/browser consumers
pnpm run docs:dev       # VitePress dev server
pnpm run docs:build     # Build documentation site
pnpm run docs:preview   # Preview built docs
```

The standalone Vue package and framework-independent viewer are extracted, and independent release
tooling is configured. Other integrations follow in stages.

## Viewer and framework adapters

Run `pnpm run build` before cross-package type checks or consumers. Build order follows the
workspace graph: viewer → Vue → VitePress. Vue declares its viewer runtime dependency in
`dependencies` through `workspace:^`. VitePress similarly depends on Vue at runtime. Each package
keeps neighboring JavaScript external and incorporates only their CSS into its public stylesheet. Do
not restore temporary runtime bundling. The consumer Node requirement is separate from the
repository toolchain; core/Vue remain ESM and VitePress keeps its ESM/CJS compatibility contract.

Use `pnpm run example:vanilla` or `pnpm run example:vue` and `pnpm run check:examples` for both
consumers' types, SSR and production builds. Component customization lives in an application-owned
`mermaid-viewer.ts` object; the contract is in `packages/viewer/src/customization.ts`, and VitePress
CSS mapping is isolated in `packages/vitepress/src/styles/vitepress.css`.

The caller owns a dedicated host, and the runtime owns its child DOM. Frameworks must not reconcile
runtime-owned children. Subscribe to DOM events before mounting, replace the complete options on
update, and call `destroy` during framework teardown. Existing-SVG enhancement owns only its trigger
listeners/attributes and dialog; the platform retains its original SVG. Imports must remain
SSR-safe.
