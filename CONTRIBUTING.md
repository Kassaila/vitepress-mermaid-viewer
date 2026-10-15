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

The root is private and contains shared lint, format and Git tooling. The VitePress plugin lives in
`packages/vitepress` with its own manifest, source, tests, build config, README, changelog and
license. Its npm name and public exports remain `vitepress-mermaid-viewer`.

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
versioning will be added when the viewer and Vue packages are extracted.

## Quick Reference

```bash
pnpm run build          # Production build (ESM + CJS + types)
pnpm run build:dev      # Development build (with sourcemaps, no minify)
pnpm run dev            # Build in watch mode
pnpm run lint           # ESLint check
pnpm run lint:fix       # ESLint auto-fix
pnpm run format         # Format code with Prettier
pnpm run check:all      # Full validation (format + lint + types + tests + build)
pnpm run docs:dev       # VitePress dev server
pnpm run docs:build     # Build documentation site
pnpm run docs:preview   # Preview built docs
```

pnpm workspace migration prepares the repository for extracting the shared viewer first, then its
Vue adapter and other integrations.
