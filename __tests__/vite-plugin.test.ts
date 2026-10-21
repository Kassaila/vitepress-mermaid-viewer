import { describe, it, expect } from 'vitest';
import { resolveConfig } from 'vite';
import { MermaidPlugin } from '../src/vite-plugin';

const createPlugin = (config?: Parameters<typeof MermaidPlugin>[0]) => {
  const plugin = MermaidPlugin(config);

  return plugin as {
    name: string;
    enforce: string;
    transform: (code: string, id: string) => { code: string; map: null } | undefined;
    resolveId: (id: string) => string | undefined;
    load: (id: string) => string | undefined;
  };
};

const VITEPRESS_ENTRY_ID = '/node_modules/vitepress/dist/client/app/index.js';

const MOCK_VITEPRESS_CODE = [
  "import { createApp } from 'vue';",
  'function setup(app) {',
  "  app.component('Content', Content);",
  '}',
].join('\n');

describe('MermaidPlugin', () => {
  it('has correct name and enforce', () => {
    const plugin = createPlugin();

    expect(plugin.name).toBe('vitepress-mermaid-viewer');
    expect(plugin.enforce).toBe('post');
  });

  it('prebundles Mermaid for development while preserving existing dependency includes', async () => {
    const config = await resolveConfig(
      {
        configFile: false,
        plugins: [MermaidPlugin()],
        optimizeDeps: { include: ['existing-dep'] },
      },
      'serve',
    );

    expect(config.optimizeDeps.include).toContain('mermaid');
    expect(config.optimizeDeps.include).toContain('existing-dep');
  });

  describe('SSR configuration', () => {
    it('keeps the component in the SSR bundle so VitePress can resolve client imports', async () => {
      const config = await resolveConfig(
        { configFile: false, plugins: [MermaidPlugin()] },
        'build',
      );

      expect(config.ssr.noExternal).toContain('vitepress-mermaid-viewer');
    });

    it.each([
      {
        noExternal: 'existing-dep',
        expected: ['existing-dep', 'vitepress-mermaid-viewer'],
      },
      {
        noExternal: /^existing-/,
        expected: [/^existing-/, 'vitepress-mermaid-viewer'],
      },
      {
        noExternal: ['existing-dep', /^other-/],
        expected: ['existing-dep', /^other-/, 'vitepress-mermaid-viewer'],
      },
      {
        noExternal: true as const,
        expected: true,
      },
    ])(
      'preserves the existing ssr.noExternal value: $noExternal',
      async ({ noExternal, expected }) => {
        const config = await resolveConfig(
          {
            configFile: false,
            plugins: [MermaidPlugin()],
            ssr: { noExternal, external: ['other-external-dep'], target: 'node' },
          },
          'build',
        );

        expect(config.ssr.noExternal).toEqual(expected);
        expect(config.ssr.external).toContain('other-external-dep');
        expect(config.ssr.target).toBe('node');
      },
    );
  });

  describe('transform', () => {
    it('injects imports and component registration for VitePress client entry', () => {
      const plugin = createPlugin();
      const result = plugin.transform(MOCK_VITEPRESS_CODE, VITEPRESS_ENTRY_ID);

      expect(result).toBeDefined();
      expect(result!.code).toContain("import 'vitepress-mermaid-viewer/style.css';");
      expect(result!.code).toContain("import Mermaid from 'vitepress-mermaid-viewer/Mermaid';");
      expect(result!.code).toContain('app.component("Mermaid", Mermaid);');
    });

    it('returns undefined for non-VitePress files', () => {
      const plugin = createPlugin();
      const result = plugin.transform('const x = 1;', '/src/main.ts');

      expect(result).toBeUndefined();
    });
  });

  describe('resolveId', () => {
    it('resolves virtual:mermaid-config', () => {
      const plugin = createPlugin();

      expect(plugin.resolveId('virtual:mermaid-config')).toBe('\0virtual:mermaid-config');
    });

    it('returns undefined for other ids', () => {
      const plugin = createPlugin();

      expect(plugin.resolveId('some-other-module')).toBeUndefined();
    });
  });

  describe('load', () => {
    it('serves config JSON for resolved virtual module', () => {
      const plugin = createPlugin();
      const result = plugin.load('\0virtual:mermaid-config');

      expect(result).toBeDefined();
      expect(result).toContain('export default');
      const json = result!.replace('export default ', '').replace(';', '');
      const config = JSON.parse(json);

      expect(config).toEqual({
        securityLevel: 'loose',
        startOnLoad: false,
        download: true,
        downloadPng: true,
      });
    });

    it('returns undefined for other ids', () => {
      const plugin = createPlugin();

      expect(plugin.load('some-other-id')).toBeUndefined();
    });

    it('merges user config with defaults', () => {
      const plugin = createPlugin({ theme: 'dark' });
      const result = plugin.load('\0virtual:mermaid-config')!;
      const json = result.replace('export default ', '').replace(';', '');
      const config = JSON.parse(json);

      expect(config.theme).toBe('dark');
      expect(config.securityLevel).toBe('loose');
      expect(config.startOnLoad).toBe(false);
    });
  });
});
