export interface MermaidPluginConfig {
  class?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- markdown-it has no public types
type MarkdownIt = any;

export const MermaidMarkdown = (md: MarkdownIt, pluginOptions?: MermaidPluginConfig): void => {
  const defaultFenceRenderer = md.renderer.rules.fence.bind(md.renderer.rules);

  md.renderer.rules.fence = (
    tokens: unknown[],
    idx: number,
    options: unknown,
    env: unknown,
    self: unknown,
  ): string => {
    const token = tokens[idx] as { info: string; content: string };
    const info = token.info.trim();

    if (info === 'mermaid') {
      try {
        const className = pluginOptions?.class || 'mermaid';

        return `
      <ClientOnly>
      <Suspense>
      <template #default>
      <Mermaid id="mermaid-${idx}" class="${className}" graph="${encodeURIComponent(token.content)}"></Mermaid>
      </template>
        <template #fallback>
          Loading...
        </template>
      </Suspense>
      </ClientOnly>`;
      } catch (e) {
        return `<pre>${String(e)}</pre>`;
      }
    }

    if (info === 'mmd') {
      token.info = 'mermaid';
    }

    return defaultFenceRenderer(tokens, idx, options, env, self);
  };
};
