import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMermaidMock } from './helpers/setup';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import types
let initFn: (...args: any[]) => Promise<void>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import types
let renderFn: (...args: any[]) => Promise<string>;
let mock: ReturnType<typeof createMermaidMock>;

beforeEach(async () => {
  vi.resetModules();

  mock = createMermaidMock();

  vi.doMock('mermaid', () => mock);
  const mod = await import('../src/mermaid');

  initFn = mod.init;
  renderFn = mod.render;
});

describe('init', () => {
  it('calls registerExternalDiagrams when available', async () => {
    const diagrams = [{ id: 'test' }] as Parameters<typeof initFn>[0];

    await initFn(diagrams);
    expect(mock.default.registerExternalDiagrams).toHaveBeenCalledWith(diagrams);
  });

  it('handles missing registerExternalDiagrams gracefully', async () => {
    mock = createMermaidMock({ registerExternalDiagrams: null });

    vi.doMock('mermaid', () => mock);
    vi.resetModules();
    const mod = await import('../src/mermaid');

    await expect(mod.init([])).resolves.toBeUndefined();
  });

  it('catches and logs errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('registration failed');

    mock.default.registerExternalDiagrams = vi.fn().mockRejectedValue(error);
    await initFn([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[vitepress-mermaid-viewer] Failed to initialize external diagrams:',
      error,
    );
    consoleSpy.mockRestore();
  });
});

describe('render', () => {
  const config = { securityLevel: 'loose' as const, startOnLoad: false };

  it('calls mermaid.initialize on first call', async () => {
    await renderFn('id-1', 'graph TD; A-->B', config);
    expect(mock.default.initialize).toHaveBeenCalledWith(config);
  });

  it('skips initialize when config is unchanged', async () => {
    await renderFn('id-1', 'graph TD; A-->B', config);
    await renderFn('id-2', 'graph TD; C-->D', config);
    expect(mock.default.initialize).toHaveBeenCalledTimes(1);
  });

  it('re-initializes when config changes', async () => {
    await renderFn('id-1', 'graph TD; A-->B', config);
    await renderFn('id-2', 'graph TD; C-->D', { ...config, theme: 'dark' as const });
    expect(mock.default.initialize).toHaveBeenCalledTimes(2);
  });

  it('returns SVG string', async () => {
    const result = await renderFn('id-1', 'graph TD; A-->B', config);

    expect(result).toBe('<svg id="mock">mock</svg>');
  });
});
