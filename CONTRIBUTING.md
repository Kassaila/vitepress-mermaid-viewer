# Contributing

Thanks for your interest in contributing to vitepress-mermaid-viewer!

## Requirements

- Node.js >= 24.0.0
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

Declare dependencies in the workspace that uses them. Use `workspace:^` for dependencies between
future published packages and `workspace:*` for private consumers; pnpm pack rewrites these to
regular versions/ranges. There is one `pnpm-lock.yaml`, and CI installs with `--frozen-lockfile`.

Only `packages/vitepress` is currently published. The tag-triggered release workflow publishes from
that directory with the existing npm CLI authentication and provenance settings. Independent package
versioning is scheduled for the independent release step in `docs/plan.md`.

## Package conventions

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
pnpm run docs:dev       # VitePress dev server
pnpm run docs:build     # Build documentation site
pnpm run docs:preview   # Preview built docs
```

The standalone Vue package and framework-independent viewer are extracted. Independent releases come
next, followed by the other integrations.

## Viewer and framework adapters

Run `pnpm run build` before cross-package type checks or consumers. Build order follows the
workspace graph: viewer → Vue → VitePress. Vue declares its viewer runtime dependency in
`dependencies` through `workspace:^` and does not bundle its JavaScript. VitePress currently bundles
both implementations and CSS; its Vue dependency is in `devDependencies`, so the existing published
package stays self-contained. Independent package publishing/Changesets will replace this temporary
arrangement later.

Use `pnpm run example:vanilla` or `pnpm run example:vue` and `pnpm run check:examples` for both
consumers' types, SSR and production builds. Component customization lives in an application-owned
`mermaid-viewer.ts` object; the contract is in `packages/viewer/src/customization.ts`, and VitePress
CSS mapping is isolated in `packages/vitepress/src/styles/vitepress.css`.

The caller owns a dedicated host, and the runtime owns its child DOM. Frameworks must not reconcile
runtime-owned children. Subscribe to DOM events before mounting, replace the complete options on
update, and call `destroy` during framework teardown. Existing-SVG enhancement owns only its trigger
listeners/attributes and dialog; the platform retains its original SVG. Imports must remain
SSR-safe.
