# Releasing packages

Versions are independent. Changesets records user-visible changes and prepares package versions;
pnpm packs and publishes packages in dependency order:

```text
mermaid-viewer → vue-mermaid-viewer → vitepress-mermaid-viewer
```

The repository root, docs and examples are private. Library dependencies use `workspace:^` locally;
pnpm replaces this with a normal caret range when packing. Local development never requires an npm
release. Build once with `pnpm build`, then run `pnpm dev` and `pnpm docs:dev` in separate
terminals.

## Support contract

| Requirement        | Supported contract            | Consumer verification                                  |
| ------------------ | ----------------------------- | ------------------------------------------------------ |
| Repository tooling | Node 24+, pnpm 12.9.1         | Frozen workspace install, build, lint, types and tests |
| Library consumers  | Node 22.12+                   | Real tarballs on Node 22.12.0 and Node 24              |
| Mermaid            | `^11.16.1 \|\| ^12`           | 11.16.1, 12.0.0 and 12.2.0                             |
| Vue                | `^3.5.0`                      | 3.5.40 and 3.5.44                                      |
| VitePress          | `^1.6.4 \|\| ^2.0.0-alpha.17` | 1.6.4 and 2.0.0-alpha.17                               |

The CI matrix runs both Node versions against Mermaid 11.16.1 and 12.0.0 with Vue 3.5.40/VitePress
1.6.4, plus Mermaid 12.2.0 with Vue 3.5.44/VitePress 2.0.0-alpha.17. Workspace development uses
Mermaid 11.17.2; supported ranges and exact test/development versions are separate choices. Keep the
Mermaid peer range identical in all three public packages. Mermaid remains an optional peer of the
DOM package: SVG-only enhancement works without installing Mermaid or Vue. Source rendering requires
Mermaid.

Core and Vue ship ESM. Their default export conditions also allow modern Node's synchronous
`require(esm)` resolution. VitePress retains its ESM/CJS configuration entries and `./Mermaid`
component entry. The CJS component exports the component directly. This relies on Node 22.12+; do
not add top-level await to core/Vue's module graph. Public CSS files remain self-contained; package
JavaScript stays external across the dependency chain.

Browser verification uses Playwright Chromium against production builds of the packed vanilla, Vue,
hydrated Vue and VitePress consumers. It checks rendered SVGs, hydration errors, keyboard opening,
zoom, SVG/PNG downloads and focus restoration. This is not an exhaustive diagram/browser matrix. The
runtime requires native `dialog`, Pointer Events, SVG and canvas. Mermaid 12 additionally targets
ES2024 and Safari 17.4+, according to its
[upstream requirements](https://mermaid.js.org/config/usage#supported-browsers-and-runtimes).
WebKit/Safari is not part of the automated gate; upstream's support statement is not a local test
result. External diagram plugins must independently support the chosen Mermaid version.

## Release base and first publication

The existing npm `vitepress-mermaid-viewer@0.5.2` corresponds to tag `v0.5.2`, commit
`5176769658cfa78367ba5018ec6c8577268db3b9`. This branch diverged before that release. Its Mermaid
prebundling and SSR fixes are carried into the workspace layout with regression tests; old npm lock
and source directory layout are not restored.

The independent transition is prepared as VitePress 0.6.0 after applying the initial minor
changeset. The initial core and Vue versions are 0.1.0. Never upload the changed implementation as
0.5.2. The transition narrows previously broad peers: Mermaid 10, Mermaid 11 before 11.16.1, Vue
before 3.5 and VitePress before 1.6.4 are outside the new declared contract. Mermaid 12.0 and later
12.x releases are supported. Existing `withMermaid` setup and public CSS imports remain valid. Let
the package manager install the new runtime dependencies.

On 2026-10-22, the npm registry returned 404 for `mermaid-viewer` and `vue-mermaid-viewer`. This
does not reserve names or prove account permissions. Before the first publication, the maintainer
must authenticate the publishing account, confirm npm accepts both names and ensure `NPM_TOKEN` can
publish all three public packages. Name ownership and token/trusted-publisher configuration cannot
be established by local tarball checks. No account settings are changed by these commands.

## Record a change

```bash
pnpm changeset
pnpm release:status
```

Commit the generated `.changeset/*.md` with the implementation. Select the public packages whose
behavior changes. Changesets propagates incompatible internal dependency changes to dependents;
packages do not share one version. Private workspaces are neither versioned nor tagged.

Release notes belong to changeset files; the version command writes each package's `CHANGELOG.md`.
Do not maintain a second copy under an `Unreleased` heading after a change has been versioned.

## Prepare and validate without publishing

```bash
pnpm install --frozen-lockfile
pnpm release:status
pnpm release:version
pnpm exec playwright install chromium
pnpm release:check
pnpm docs:build
pnpm check:examples
```

`release:version` changes manifests, package changelogs and the lockfile; it does not upload
anything. Review and commit those changes before publication. If there are no pending changesets, do
not invent another version bump for an already prepared release.

After version preparation, use `pnpm release:ready` to check the prepared state. `release:status`
checks pending changesets; on a branch with uncommitted version changes it can report changed
packages without new changesets even though the release versions have already been prepared.

`release:check` runs formatting, builds, lint, types, unit tests, SSR imports and real packed
consumers. The latter install archives in temporary projects outside the workspace, substitute only
the unpublished internal dependencies with tarballs, disable automatic peers and enforce peer
ranges. Public declarations, ESM/CJS, CSS, production builds and browser hydration are checked. The
SVG-only project explicitly has neither Mermaid nor Vue installed. No source aliases or repository
`node_modules` links are used by those consumers.

Consumer tsconfigs use `skipLibCheck`, as the workspace does, while positive and negative public API
checks verify the propagated types. Checking every upstream declaration with `skipLibCheck: false`
is outside this gate; the pinned Mermaid 11/VitePress 1 dependencies currently report their own
declaration errors under that setting.

Useful targeted commands after building packages:

```bash
pnpm check:packed --offline --keep
pnpm check:packed --mermaid 11.16.1 --vue 3.5.40 --vitepress 1.6.4
pnpm check:packed --mermaid 12.0.0 --vue 3.5.40 --vitepress 1.6.4
pnpm check:packed --mermaid 12.2.0 --vue 3.5.44 --vitepress 2.0.0-alpha.17
```

`--offline` requires a populated pnpm store. `--keep` retains consumer directories for inspection;
failures always retain them. `CONSUMER_NODE` selects the Node executable for consumer types, SSR and
builds while the repository toolchain stays on Node 24. CI also accepts `CONSUMER_MERMAID`,
`CONSUMER_VUE` and `CONSUMER_VITEPRESS` for its compatibility matrix.

## Publish only when explicitly requested

The GitHub **Release** workflow runs only through `workflow_dispatch` on `main`. Pushing commits or
tags does not publish packages. Choose `latest` or `beta` when manually starting it. It requires
`NPM_TOKEN`, uses public access and provenance, and runs the validation gate before uploading. Use
`latest` for the first publication of the new packages. The beta channel is for prerelease versions
of established packages; it does not promote existing stable versions between dist-tags. For
prereleases, prepare prerelease versions through `pnpm changeset pre enter beta` and
`pnpm release:version`; choose the beta channel for their publication.

The underlying `release:publish` and `release:publish:beta` commands **do publish**. They first
reject unapplied changesets and then run `release:check`. pnpm retains Git branch/clean-tree checks,
publishes the public library filter with concurrency one in topological order, and waits up to ten
minutes for each exact version and its tarball to become available before proceeding downstream.
This uses pnpm's [recursive publishing and availability checks](https://pnpm.io/cli/publish).

## Resume a partial publication

Download the `npm-publish-summary` workflow artifact and inspect npm versions before retrying. The
summary records packages whose uploads were accepted even when a later step fails. A registry
availability timeout does not mean the upload was rejected.

Rerun the same workflow from the same prepared commit and channel. pnpm skips existing versions and
checks their availability before proceeding to dependents. Do not use `--force`, republish an
accepted version or bump a dependency solely because propagation was delayed. If the prepared
artifacts themselves need a fix, create a new changeset and prepare new versions. GitHub/npm
releases and Git tags are not automatically created by this workflow.
