import { describe, it, expect } from 'vitest';
import type { UserConfig } from 'vitepress';
import { withMermaid } from '../src/with-mermaid';

describe('withMermaid', () => {
  it('adds markdown config function', () => {
    const config = withMermaid({});

    expect(config.markdown?.config).toBeTypeOf('function');
  });

  it('preserves existing markdown.config', () => {
    let originalCalled = false;
    const config = withMermaid({
      markdown: {
        config: () => {
          originalCalled = true;
        },
      },
    });
    const fakeMd = { renderer: { rules: { fence: () => '' } } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.markdown!.config!(fakeMd as any);
    expect(originalCalled).toBe(true);
  });

  it('adds MermaidPlugin to vite.plugins', () => {
    const config = withMermaid({});

    expect(config.vite?.plugins).toHaveLength(1);
  });

  it('preserves existing vite plugins', () => {
    const existingPlugin = { name: 'existing' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = withMermaid({ vite: { plugins: [existingPlugin as any] } });

    expect(config.vite?.plugins).toHaveLength(2);
  });

  it('adds optimizeDeps includes', () => {
    const config = withMermaid({});
    const includes = config.vite?.optimizeDeps?.include ?? [];

    expect(includes).toContain('@braintree/sanitize-url');
    expect(includes).toContain('dayjs');
    expect(includes).toContain('debug');
    expect(includes).toContain('cytoscape-cose-bilkent');
    expect(includes).toContain('cytoscape');
  });

  it('preserves existing optimizeDeps includes', () => {
    const config = withMermaid({
      vite: { optimizeDeps: { include: ['existing-dep'] } },
    });
    const includes = config.vite?.optimizeDeps?.include ?? [];

    expect(includes).toContain('existing-dep');
    expect(includes).toContain('dayjs');
  });

  it('sets resolve aliases as object', () => {
    const config = withMermaid({});
    const aliases = config.vite?.resolve?.alias as Record<string, string>;

    expect(aliases['dayjs/plugin/advancedFormat.js']).toBe('dayjs/esm/plugin/advancedFormat');
    expect(aliases['dayjs/plugin/customParseFormat.js']).toBe('dayjs/esm/plugin/customParseFormat');
    expect(aliases['dayjs/plugin/isoWeek.js']).toBe('dayjs/esm/plugin/isoWeek');
    expect(aliases['cytoscape/dist/cytoscape.umd.js']).toBe('cytoscape/dist/cytoscape.esm.js');
  });

  it('merges with existing object aliases', () => {
    const config = withMermaid({
      vite: { resolve: { alias: { '@': '/src' } } },
    });
    const aliases = config.vite?.resolve?.alias as Record<string, string>;

    expect(aliases['@']).toBe('/src');
    expect(aliases['dayjs/plugin/advancedFormat.js']).toBe('dayjs/esm/plugin/advancedFormat');
  });

  it('merges with existing array aliases', () => {
    const config = withMermaid({
      vite: {
        resolve: {
          alias: [{ find: '@', replacement: '/src' }],
        },
      },
    } as UserConfig);
    const aliases = config.vite?.resolve?.alias as Array<{ find: string; replacement: string }>;

    expect(Array.isArray(aliases)).toBe(true);
    expect(aliases.some((a) => a.find === '@')).toBe(true);
    expect(aliases.some((a) => a.find === 'dayjs/plugin/advancedFormat.js')).toBe(true);
  });
});
