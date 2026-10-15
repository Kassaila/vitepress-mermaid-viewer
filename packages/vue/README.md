# Mermaid Viewer for Vue

Interactive Mermaid diagrams with fullscreen, zoom, pan, keyboard controls, source copy and SVG/PNG
export. This package uses Vue and Mermaid without VitePress or a virtual configuration module. The
initial supported peer ranges are Vue `^3.5.0` and Mermaid `^11.16.0`.

The package is currently consumed inside this workspace. Independent releases follow the extraction
of the framework-independent viewer.

```vue
<script setup lang="ts">
import { MermaidViewer } from 'vue-mermaid-viewer';
import 'vue-mermaid-viewer/style.css';
import { viewerCustomization } from './mermaid-viewer';
</script>

<template>
  <MermaidViewer
    source="graph TD; A-->B"
    :config="{ theme: 'forest' }"
    :customization="viewerCustomization"
  />
</template>
```

## Customization file

Keep component CSS overrides and JS labels in one application-owned file:

```ts
// mermaid-viewer.ts
import type { ViewerCustomization } from 'vue-mermaid-viewer';

export const viewerCustomization = {
  css: {
    '--mv-accent': '#a03592',
    '--mv-radius': '1rem',
    '--mv-font-family': 'system-ui, sans-serif',
  },
  labels: {
    trigger: 'Open diagram',
    close: 'Close viewer',
  },
} satisfies ViewerCustomization;
```

Overrides apply to loading/error states, the diagram and the fullscreen dialog teleported to `body`.
Changing customization or `appearance` updates the UI without rendering Mermaid again. Replace
`source` or `config` to render a new diagram; configuration is not deeply watched or merged.
Removing an override restores its default. Each instance can have its own customization.

You can also set tokens on `:root` in application CSS. Object overrides take precedence. Use the
customization object for instance-specific tokens so the same values reach the teleported dialog;
ancestor-scoped CSS variables and a `style` attribute stay on the inline diagram.

| CSS token                                               | Purpose                                 |
| ------------------------------------------------------- | --------------------------------------- |
| `--mv-bg`                                               | Fullscreen background                   |
| `--mv-surface`                                          | Diagram, toolbar and control background |
| `--mv-surface-hover`, `--mv-surface-active`             | Control interaction backgrounds         |
| `--mv-text`, `--mv-border`                              | Text and borders                        |
| `--mv-accent`, `--mv-accent-hover`, `--mv-accent-muted` | Focus, hover and viewport accents       |
| `--mv-danger`                                           | Error state                             |
| `--mv-radius`, `--mv-padding`                           | Inline diagram radius and padding       |
| `--mv-min-height`                                       | Loading placeholder height              |
| `--mv-font-family`                                      | UI font                                 |

`appearance="dark"` selects dark UI defaults. Mermaid colors and fonts belong to `config.theme`,
`config.themeVariables` and `config.fontFamily`; UI CSS does not rewrite generated SVG styles.

Available JS labels are exported as `defaultViewerLabels`; `customization.labels` accepts a partial
replacement. `controls` selects actions: `{ copySource: false, svg: true, png: false }`.

## Component API

- `source: string` — raw Mermaid source, without URL encoding.
- `id?: string` — download filename identifier; render IDs are generated independently.
- `config?: MermaidConfig` — replacement Mermaid configuration. Rendering is manual; `startOnLoad`
  stays disabled. The standalone component defaults to Mermaid's strict security mode.
- `appearance?: 'light' | 'dark'` — UI appearance, default `light`.
- `customization?: ViewerCustomization` — CSS tokens and JS labels.
- `controls?: ViewerControls` — action visibility; all enabled by default.
- Events: `ready({ source, svg })`, `error({ stage, cause, retainedSvg })`, `open`, `close`.
- Component ref: `open()`, `close()`, `reset()`. Unmount disposes the viewer.

A rendering update closes an open dialog. If it fails, the previous successful SVG and its source
remain available for viewing/copy/export. Late results are ignored after replacement or unmount.
Mermaid initialization and rendering are serialized across components because the engine shares
configuration. Temporary rendering DOM is removed after success or failure.

To register external diagram definitions, complete browser setup before mounting the application:

```ts
import { registerExternalDiagrams } from 'vue-mermaid-viewer/mermaid';

await registerExternalDiagrams(definitions);
```

Package imports are safe during SSR. The component emits a loading placeholder on the server and
loads Mermaid after mounting in the browser. Import `style.css` once in your application entry.

## Workspace example

From the repository root, run `pnpm run build`, then `pnpm run example:vue`. The example has
editable source, theme switching and its own `src/mermaid-viewer.ts` customization file. Run
`pnpm run check:examples` for consumer type checks, SSR rendering and a production build.
