---
layout: home
description:
  VitePress plugin that renders mermaid code blocks as interactive diagrams with fullscreen zoom/pan
  viewer.

hero:
  name: Mermaid Viewer
  text: Interactive mermaid diagrams for VitePress
  tagline: Drop-in replacement for vitepress-plugin-mermaid with a built-in diagram viewer.
  image:
    src: /logo.svg
    alt: VitePress Mermaid Viewer
  actions:
    - theme: brand
      text: Get Started
      link: /guide/usage
    - theme: alt
      text: Examples
      link: /guide/examples
    - theme: alt
      text: GitHub
      link: https://github.com/Kassaila/vitepress-mermaid-viewer
    - theme: alt
      text: "\u2B50 Star"
      link: https://github.com/Kassaila/vitepress-mermaid-viewer/stargazers

features:
  - icon: "\U0001F4CA"
    title: Mermaid Diagrams
    details: Renders mermaid and mmd code blocks as diagrams. Supports all mermaid diagram types.
  - icon: "\U0001F50D"
    title: Interactive Viewer
    details:
      Click any diagram to open a fullscreen viewer. Zoom with wheel, pinch, or buttons. Pan with
      drag.
  - icon: "\U0001F319"
    title: Theme Reactivity
    details:
      Automatically switches between light and dark themes. Override per page via mermaidTheme
      frontmatter.
  - icon: "\U0001F4E6"
    title: Drop-in Setup
    details:
      Single withMermaid() wrapper — no extra configuration. Or use granular MermaidMarkdown and
      MermaidPlugin exports.
---
