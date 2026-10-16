# mermaid-viewer

Interactive Mermaid diagrams with zoom, pan, fullscreen, SVG/PNG export and source copying. Written
in TypeScript and browser DOM, with no framework dependency. This package is under development in
the workspace; independent npm releases are the next milestone.

## Source rendering

```ts
import { mountViewer } from 'mermaid-viewer';
import 'mermaid-viewer/style.css';

const host = document.querySelector<HTMLElement>('#diagram')!;
const viewer = mountViewer(host, {
  source: 'flowchart LR; A-->B',
  config: { theme: 'default' },
});

viewer.update({ source: 'sequenceDiagram\nAlice->>Bob: Hello' });
viewer.open();
viewer.close();
viewer.reset();
viewer.destroy();
```

Use a dedicated empty host. The caller owns the host; the viewer owns its child figure and a
body-mounted native `<dialog>`. `destroy()` removes only owned DOM and listeners. A destroyed
instance cannot be reused; mount a fresh instance instead.

Imports are SSR-safe and do not load Mermaid or access the DOM. Call `mountViewer` only in the
browser. Install Mermaid for source rendering; it is loaded lazily. Mermaid is an optional peer
because SVG enhancement does not need it.

## Existing SVG

```ts
import { enhanceSvg } from 'mermaid-viewer';
import 'mermaid-viewer/style.css';

const trigger = document.querySelector<HTMLElement>('#platform-diagram')!;
const svg = trigger.querySelector('svg')!;
const viewer = enhanceSvg(trigger, { svg, source: 'flowchart LR; A-->B' });
```

Pass a trusted Mermaid-derived SVG inside the trigger wrapper. Enhancement never rewrites, moves or
removes that platform-owned SVG. Call `update` after SVG replacement or in-place content changes,
passing the SVG and optional source together. Detached SVG cannot open. Fullscreen uses a copy with
independent IDs and local references. Original JavaScript callbacks are not copied into fullscreen;
links remain available. This API is not an SVG sanitizer.

## Options and events

`update` takes the complete next options object. Omitted optional fields reset to defaults.
Source/config replacements request rendering; replace config objects rather than mutate them.
UI-only updates apply without rendering or closing the dialog.

| Option               | Default                  | Purpose                                                             |
| -------------------- | ------------------------ | ------------------------------------------------------------------- |
| `source`             | required for source mode | Raw Mermaid text                                                    |
| `config`             | `{}`                     | Mermaid configuration; source mode only                             |
| `id`                 | `diagram`                | Download filename suffix, never a render ID                         |
| `appearance`         | `light`                  | Viewer UI appearance, independent of Mermaid theme                  |
| `customization`      | `{}`                     | CSS variables and JS labels                                         |
| `controls`           | all enabled              | `svg`, `png`, `copySource` booleans                                 |
| `openOnDiagramClick` | `true`                   | Click and Enter/Space trigger; use `false` with an external control |

DOM events on the host bubble and are composed:

- `mermaid-viewer:ready`: `{ source, svg }`; enhancement without source uses an empty string.
- `mermaid-viewer:error`: `{ stage: 'render' | 'export' | 'clipboard', cause, retainedSvg }`.
- `mermaid-viewer:open` and `mermaid-viewer:close`.

Install listeners before mounting. `open` before readiness is a no-op. Closing, resetting and
destroying are idempotent. Only one viewer dialog is open per document. Closing restores focus to a
connected previous target and restores the previous body overflow style.

Renders are serialized because Mermaid configuration is shared. Stale queued jobs are skipped;
in-flight Mermaid work cannot be physically cancelled, but its late result cannot commit after an
update or destroy. Its temporary staging subtree is removed when that work settles. A failed
replacement retains the last successful SVG/source pair, so copying and exporting stay consistent.
Source/config changes close fullscreen before rendering. Initial errors display source as text.

The source API defaults to `securityLevel: 'strict'` and Mermaid theme `default`. UI appearance does
not choose a diagram theme. Sandbox/iframe output is unsupported and produces a render error.

## Customization

```ts
import type { ViewerCustomization } from 'mermaid-viewer';

export const customization = {
  css: { '--mv-accent': '#a03592', '--mv-radius': '1rem' },
  labels: { close: 'Закрыть', trigger: 'Открыть диаграмму' },
} satisfies ViewerCustomization;
```

Pass `customization` in options or set public `--mv-*` tokens in host CSS. The same tokens are
copied to the body dialog on open and update, including tokens inherited from a container. The
component never reads VitePress variables. CSS must be imported once by the application.

Register external diagram definitions before mounting through `registerExternalDiagrams` from
`mermaid-viewer/mermaid`. Registration and rendering share the same queue. No Web Component
registration happens automatically; a custom-element facade is a separate future step.

Run the ordinary TypeScript consumer with `pnpm run build` followed by `pnpm run example:vanilla`.
