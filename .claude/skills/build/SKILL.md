---
name: build
description:
  Build the project with tsdown. Use automatically after significant code changes to verify
  compilation succeeds.
allowed-tools: Bash(npm run build*), Bash(ls *)
---

Build vitepress-mermaid-viewer:

1. Run `npm run build`
2. Verify output:
   - Check `dist/` directory exists
   - Verify files: `index.js`, `index.cjs`, `index.d.ts`, `index.d.cts`, `Mermaid.js`,
     `Mermaid.cjs`, `style.css`
3. Report any TypeScript errors or warnings

For development build with sourcemaps, use: `npm run build:dev`
