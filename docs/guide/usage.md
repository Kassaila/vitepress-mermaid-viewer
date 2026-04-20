---
description: Install and configure vitepress-mermaid-viewer — setup guide, API reference, and viewer controls.
---

<img src="/og_image.png" alt="VitePress Mermaid Viewer — Interactive mermaid diagrams for VitePress" style="width: 100%; border-radius: 12px; margin-bottom: 24px;" />

# Usage

## Installation

```bash
npm install vitepress-mermaid-viewer mermaid
```

## Simple setup with wrapper

Wrap your VitePress config — adds markdown plugin, Vite plugin, optimizeDeps, and module aliases
automatically.

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

## Manual setup

Use individual exports for full control over the configuration.

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

| Action      | Input                                                |
| ----------- | ---------------------------------------------------- |
| Open viewer | Click on diagram, `Enter` / `Space` when focused     |
| Zoom in     | `+` button, mouse wheel up, pinch out, `+` / `=` key |
| Zoom out    | `−` button, mouse wheel down, pinch in, `-` key      |
| Pan         | Click and drag, arrow keys                           |
| Reset       | `↻` button, `0` key                                  |
| Close       | `✕` button, `Escape` key                             |

### Accessibility

- Diagrams are focusable (`role="button"`, `tabindex="0"`) and open with `Enter` or `Space`
- Fullscreen `<dialog>` traps focus natively; focus returns to the triggering diagram on close
- Controls expose `aria-label` and the zoom level announces changes via `aria-live="polite"`

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
