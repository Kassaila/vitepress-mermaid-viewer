# Package changesets

Run `pnpm changeset` for a user-visible package change and commit the generated Markdown file with
the implementation. Select only the public packages that changed; versions are independent.

Run `pnpm release:status` to review pending changes. `pnpm release:version` applies the changesets
to package versions, internal dependency ranges, changelogs and the lockfile. It does not publish.
Review and commit those changes before manually starting the release workflow.

The prepared first release uses `mermaid-viewer@0.1.0`, `vue-mermaid-viewer@0.1.0` and VitePress
0.6.0. The initial minor changeset has been applied to the published VitePress 0.5.2 baseline.

See [the release guide](../RELEASING.md) for compatibility, tarball checks and publishing order.
