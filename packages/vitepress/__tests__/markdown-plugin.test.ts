import { describe, it, expect } from 'vitest';
import { createMarkdownItStub } from './helpers/setup';
import { MermaidMarkdown } from '../src/markdown-plugin';

const createToken = (info: string, content: string) => ({ info, content });

const applyPlugin = (pluginOptions?: { class?: string }) => {
  const { md, defaultFence } = createMarkdownItStub();

  MermaidMarkdown(md, pluginOptions);

  return { md, defaultFence };
};

describe('MermaidMarkdown', () => {
  it('renders mermaid fence as ClientOnly + Suspense-wrapped Mermaid component', () => {
    const { md } = applyPlugin();
    const tokens = [createToken('mermaid', 'graph TD; A-->B')];
    const result = md.renderer.rules.fence(tokens, 0, {}, {}, {});

    expect(result).toContain('<ClientOnly>');
    expect(result).toContain('<Suspense>');
    expect(result).toContain('<Mermaid');
    expect(result).toContain('id="mermaid-0"');
    expect(result).toContain(`graph="${encodeURIComponent('graph TD; A-->B')}"`);
    expect(result).toContain('</Suspense>');
    expect(result).toContain('</ClientOnly>');
  });

  it('uses custom class from plugin options', () => {
    const { md } = applyPlugin({ class: 'custom-diagram' });
    const tokens = [createToken('mermaid', 'graph TD')];
    const result = md.renderer.rules.fence(tokens, 0, {}, {}, {});

    expect(result).toContain('class="custom-diagram"');
  });

  it('defaults class to "mermaid"', () => {
    const { md } = applyPlugin();
    const tokens = [createToken('mermaid', 'graph TD')];
    const result = md.renderer.rules.fence(tokens, 0, {}, {}, {});

    expect(result).toContain('class="mermaid"');
  });

  it('encodes content with encodeURIComponent', () => {
    const { md } = applyPlugin();
    const content = 'graph TD; A["Hello World"]-->B';
    const tokens = [createToken('mermaid', content)];
    const result = md.renderer.rules.fence(tokens, 0, {}, {}, {});

    expect(result).toContain(`graph="${encodeURIComponent(content)}"`);
  });

  it('mutates mmd token info to mermaid and delegates to default renderer', () => {
    const { md, defaultFence } = applyPlugin();
    const token = createToken('mmd', 'graph TD');
    const tokens = [token];

    md.renderer.rules.fence(tokens, 0, 'opts', 'env', 'self');

    expect(token.info).toBe('mermaid');
    expect(defaultFence).toHaveBeenCalledWith(tokens, 0, 'opts', 'env', 'self');
  });

  it('passes non-mermaid fences to default renderer', () => {
    const { md, defaultFence } = applyPlugin();
    const tokens = [createToken('javascript', 'const x = 1')];

    md.renderer.rules.fence(tokens, 0, 'opts', 'env', 'self');

    expect(defaultFence).toHaveBeenCalledWith(tokens, 0, 'opts', 'env', 'self');
  });

  it('falls back to "mermaid" when class contains attribute-breaking characters', () => {
    const { md } = applyPlugin({ class: 'foo" onclick="alert(1)' });
    const tokens = [createToken('mermaid', 'graph TD')];
    const result = md.renderer.rules.fence(tokens, 0, {}, {}, {});

    expect(result).toContain('class="mermaid"');
    expect(result).not.toContain('onclick');
  });

  it('accepts multi-token class names with spaces and dashes', () => {
    const { md } = applyPlugin({ class: 'my-diagram another-class' });
    const tokens = [createToken('mermaid', 'graph TD')];
    const result = md.renderer.rules.fence(tokens, 0, {}, {}, {});

    expect(result).toContain('class="my-diagram another-class"');
  });
});
