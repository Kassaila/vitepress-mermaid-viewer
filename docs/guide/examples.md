# Examples

Click any diagram below to open the interactive viewer. Use mouse wheel, pinch, or buttons to zoom.
Drag to pan.

## Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> B
    C --> E[Ship it]
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant DB as Database

    U->>C: Click button
    C->>S: POST /api/data
    S->>DB: INSERT INTO items
    DB-->>S: OK
    S-->>C: 201 Created
    C-->>U: Show success
```

## Class Diagram

```mermaid
classDiagram
    class VitePressConfig {
        +markdown: MarkdownOptions
        +vite: ViteConfig
    }

    class MermaidMarkdown {
        +install(md, options)
    }

    class MermaidPlugin {
        +name: string
        +configResolved()
        +transform()
    }

    class MermaidComponent {
        +graph: string
        +id: string
        +renderChart()
        +openZoom()
    }

    VitePressConfig --> MermaidMarkdown : markdown plugin
    VitePressConfig --> MermaidPlugin : vite plugin
    MermaidPlugin --> MermaidComponent : registers
    MermaidMarkdown --> MermaidComponent : emits tags
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Rendering : page load
    Rendering --> Displayed : SVG ready
    Displayed --> Zoomed : click diagram
    Zoomed --> Panning : drag
    Panning --> Zoomed : release
    Zoomed --> Displayed : close / Escape
    Displayed --> Rendering : theme change
```

## Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD

    section Core
    Markdown plugin       :done, mp, 2026-01-01, 7d
    Vite plugin           :done, vp, after mp, 5d
    Vue component         :done, vc, after vp, 10d

    section Viewer
    Zoom & pan            :done, zp, after vc, 7d
    Pinch-to-zoom         :done, pz, after zp, 3d
    Scale display         :done, sd, after pz, 2d

    section Release
    Documentation         :active, doc, after sd, 5d
    Publish to npm        :pub, after doc, 1d
```

## Pie Chart

```mermaid
pie title Plugin Bundle Composition
    "Vue Component" : 45
    "Vite Plugin" : 25
    "Markdown Plugin" : 20
    "Styles" : 10
```

## Git Graph

```mermaid
gitGraph
    commit id: "init"
    commit id: "core plugins"
    branch develop
    checkout develop
    commit id: "zoom viewer"
    commit id: "pinch-to-zoom"
    commit id: "scale display"
    checkout main
    merge develop id: "v0.1.0"
    commit id: "docs"
```
