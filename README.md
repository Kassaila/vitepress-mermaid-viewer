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
- Dark/light theme reactivity
- Supports `mmd` alias for mermaid blocks
- Per-page theme override via `mermaidTheme` frontmatter

## Installation

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
      include: ['@braintree/sanitize-url', 'dayjs', 'debug', 'cytoscape-cose-bilkent', 'cytoscape'],
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

## Viewer Controls

| Action      | Input                                         |
| ----------- | --------------------------------------------- |
| Open viewer | Click on diagram                              |
| Zoom in/out | `+` / `-` buttons, mouse wheel, pinch gesture |
| Pan         | Click and drag                                |
| Reset       | `↻` button                                    |
| Close       | `✕` button, `Escape` key                      |

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

## Contributing

Contributions are welcome! See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for guidelines.

## License

MIT
