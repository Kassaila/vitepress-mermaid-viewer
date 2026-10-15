import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMermaidMock } from './helpers/setup';
import type * as MermaidEngine from '../src/mermaid';

let engine: typeof MermaidEngine;
let mock: ReturnType<typeof createMermaidMock>;

beforeEach(async () => {
  vi.resetModules();

  mock = createMermaidMock();

  vi.doMock('mermaid', () => mock);

  engine = await import('../src/mermaid');
});

describe('Mermaid engine', () => {
  it('disables automatic rendering before registering external diagrams', async () => {
    await engine.registerExternalDiagrams([]);
    expect(mock.default.initialize).toHaveBeenCalledWith({ startOnLoad: false });
    expect(mock.default.registerExternalDiagrams).toHaveBeenCalledWith([]);
    expect((mock.default as { startOnLoad?: boolean }).startOnLoad).toBe(false);
  });

  it('propagates registration failures and keeps the render queue usable', async () => {
    mock.default.registerExternalDiagrams!.mockRejectedValueOnce(new Error('registration failed'));
    await expect(engine.registerExternalDiagrams([])).rejects.toThrow('registration failed');
    await expect(engine.render('graph TD; A-->B', {})).resolves.toMatchObject({
      svg: expect.any(String),
    });
  });

  it('forces manual rendering, isolates staging DOM and cleans it on success', async () => {
    mock.default.render.mockImplementationOnce(
      (_id: string, _source: string, container: HTMLElement) => {
        expect(container.isConnected).toBe(true);

        container.innerHTML = '<svg id="staging" />';

        return Promise.resolve({ svg: '<svg id="committed" />' });
      },
    );
    await engine.render('graph TD; A-->B', { startOnLoad: true });
    expect(mock.default.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        startOnLoad: false,
        suppressErrorRendering: true,
        securityLevel: 'strict',
      }),
    );
    expect(document.querySelector('[data-mermaid-viewer-staging]')).toBeNull();
    expect(document.getElementById('staging')).toBeNull();
  });

  it('cleans staging DOM after rejection and permits later renders', async () => {
    mock.default.render.mockRejectedValueOnce(new Error('invalid source'));
    await expect(engine.render('invalid', {})).rejects.toThrow('invalid source');
    expect(document.querySelector('[data-mermaid-viewer-staging]')).toBeNull();
    await expect(engine.render('graph TD; A-->B', {})).resolves.toBeDefined();
  });

  it('serializes configuration and render across independent components', async () => {
    let finish!: (value: { svg: string }) => void;

    mock.default.render.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = engine.render('graph TD; A-->B', { theme: 'forest' });
    const second = engine.render('graph TD; C-->D', { theme: 'dark' });

    await vi.waitFor(() => expect(mock.default.render).toHaveBeenCalledTimes(1));
    expect(mock.default.initialize).toHaveBeenCalledTimes(1);
    finish({ svg: '<svg />' });
    await Promise.all([first, second]);
    expect(mock.default.initialize).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ theme: 'dark' }),
    );
    expect(mock.default.render.mock.calls[0][0]).not.toBe(mock.default.render.mock.calls[1][0]);
  });
});
