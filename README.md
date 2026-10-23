# VitePress Mermaid Viewer

> _Diagrams that you can actually read._

[![npm version](https://img.shields.io/npm/v/vitepress-mermaid-viewer.svg)](https://www.npmjs.com/package/vitepress-mermaid-viewer)
[![docs](https://img.shields.io/badge/docs-VitePress-6366f1)](https://kassaila.github.io/vitepress-mermaid-viewer/)
[![license](https://img.shields.io/npm/l/vitepress-mermaid-viewer.svg)](https://github.com/Kassaila/vitepress-mermaid-viewer/blob/main/LICENSE)

**Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing.**

## Features

- Renders ` ```mermaid ` code blocks as diagrams
- Click any diagram to open fullscreen viewer
- Zoom: buttons, mouse wheel (cursor-centered), pinch-to-zoom (touch)
- Pan/drag with mouse or touch
- Keyboard accessible — `Enter` / `Space` to open, `+` / `-` / `0` / arrows inside the viewer, ARIA
  labels and focus management
- Dark/light theme reactivity
- Supports `mmd` alias for mermaid blocks
- Per-page theme override via `mermaidTheme` frontmatter

## Installation

Requires Node 22.12+, Vue `^3.5.0`, Mermaid `^11.16.1 || ^12` and VitePress
`^1.6.4 || ^2.0.0-alpha.17`. The plugin installs `vue-mermaid-viewer` and `mermaid-viewer` as
runtime dependencies. See the [release and support guide](./RELEASING.md).

```bash
npm install vitepress-mermaid-viewer mermaid
```

## Quick Start

### Simple setup with wrapper

```ts
// docs/.vitepress/config.ts
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-mermaid-viewer';

export default withMermaid(
  defineConfig({
    // your VitePress config...

    // optional mermaid config
    mermaid: {
      theme: 'default',
    },

    // optional plugin config
    mermaidPlugin: {
      class: 'mermaid',
    },
  }),
);
```

### Manual setup

```ts
// docs/.vitepress/config.ts
import { defineConfig } from 'vitepress';
import { MermaidPlugin, MermaidMarkdown } from 'vitepress-mermaid-viewer';

export default defineConfig({
  markdown: {
    config: (md) => {
      MermaidMarkdown(md, { class: 'mermaid' });
    },
  },

  vite: {
    plugins: [
      MermaidPlugin({
        // mermaid config
        theme: 'default',
      }),
    ],

    optimizeDeps: {
      include: [
        'mermaid > @braintree/sanitize-url',
        'mermaid > dayjs',
        'mermaid > cytoscape-cose-bilkent',
        'mermaid > cytoscape',
      ],
    },

    resolve: {
      alias: {
        'dayjs/plugin/advancedFormat.js': 'dayjs/esm/plugin/advancedFormat',
        'dayjs/plugin/customParseFormat.js': 'dayjs/esm/plugin/customParseFormat',
        'dayjs/plugin/isoWeek.js': 'dayjs/esm/plugin/isoWeek',
        'cytoscape/dist/cytoscape.umd.js': 'cytoscape/dist/cytoscape.esm.js',
      },
    },
  },
});
```

## Customization

Keep component overrides in a separate file typed as `ViewerCustomization` (exported by
`vitepress-mermaid-viewer`), then pass the object as `mermaid.viewer`:

```ts
// docs/.vitepress/mermaid-viewer.ts
import type { ViewerCustomization } from 'vitepress-mermaid-viewer';

export const viewerCustomization = {
  css: { '--mv-radius': '1rem', '--mv-accent': 'var(--vp-c-brand-1)' },
  labels: { trigger: 'Open diagram', close: 'Close viewer' },
} satisfies ViewerCustomization;
```

```ts
mermaid: {
  viewer: viewerCustomization;
}
```

The integration maps component tokens to the VitePress theme. Overrides apply to the diagram and
fullscreen dialog. See the
[customization guide](https://kassaila.github.io/vitepress-mermaid-viewer/guide/usage#customization)
for all CSS tokens and the complete configuration example.

## Viewer Controls

| Action       | Input                                                |
| ------------ | ---------------------------------------------------- |
| Open viewer  | Click on diagram, `Enter` / `Space` when focused     |
| Zoom in      | `+` button, mouse wheel up, pinch out, `+` / `=` key |
| Zoom out     | `−` button, mouse wheel down, pinch in, `-` key      |
| Pan          | Click and drag, arrow keys                           |
| Reset        | `↻` button, `0` key                                  |
| Copy source  | `⎘` button in viewer                                 |
| Download SVG | `SVG` button in viewer                               |
| Download PNG | `PNG` button in viewer                               |
| Close        | `✕` button, `Escape` key                             |

## Frontmatter Options

Override mermaid theme per page:

```yaml
---
mermaidTheme: forest
---
```

## API

### `withMermaid(config: UserConfig): UserConfig`

Wraps VitePress config — adds markdown plugin, Vite plugin, optimizeDeps, and module aliases.

### `MermaidMarkdown(md, options?)`

Markdown-it plugin. Intercepts ` ```mermaid ` fences and renders them as `<Mermaid>` components.

**Options:**

- `class` — CSS class for diagram container (default: `'mermaid'`)

### `MermaidPlugin(config?)`

Vite plugin. Injects `<Mermaid>` component globally and serves mermaid config via virtual module.

Accepts [mermaid configuration](https://mermaid.js.org/config/schema-docs/config.html) object.

**Additional options:**

- `download` — show Download SVG button in viewer (default: `true`)
- `downloadPng` — show Download PNG button in viewer (default: `true`)

## Contributing

Development uses pnpm workspaces; the plugin lives in `packages/vitepress`. Contributions are
welcome! See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for guidelines.

## License

MIT
