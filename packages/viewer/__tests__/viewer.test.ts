import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountViewer } from '../src/viewer';
import type { ViewerHandle, ViewerOptions } from '../src/types';
import { flushPromises } from './helpers/setup';

const { mockRender } = vi.hoisted(() => ({ mockRender: vi.fn() }));

vi.mock('../src/mermaid', () => ({ render: mockRender }));

const A = 'graph TD; A-->B';
const B = 'graph TD; C-->D';
const instances: ViewerHandle[] = [];
const createViewer = async (options: Partial<ViewerOptions> = {}) => {
  const host = document.createElement('div');
  const ready = vi.fn();
  const error = vi.fn();
  const close = vi.fn();

  document.body.append(host);
  host.addEventListener('mermaid-viewer:ready', ready);
  host.addEventListener('mermaid-viewer:error', error);
  host.addEventListener('mermaid-viewer:close', close);
  const handle = mountViewer(host, { source: A, ...options });

  instances.push(handle);
  await flushPromises();

  return { host, handle, ready, error, close, figure: host.querySelector('figure')! };
};
const dialog = () => document.querySelector<HTMLDialogElement>('dialog')!;

beforeEach(() => {
  mockRender
    .mockReset()
    .mockResolvedValue({ svg: '<svg id="test" viewBox="0 0 100 100">rendered</svg>' });
});
afterEach(() => {
  for (const handle of instances.splice(0)) handle.destroy();

  document.body.replaceChildren();

  document.body.style.overflow = '';

  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('DOM viewer rendering', () => {
  it('renders raw source, binds interactions and emits a bubbling/composed event', async () => {
    const bindFunctions = vi.fn();

    mockRender.mockResolvedValueOnce({ svg: '<svg>diagram</svg>', bindFunctions });
    const { host, ready, figure } = await createViewer();

    expect(mockRender).toHaveBeenCalledWith(A, {}, expect.any(Function), document);
    expect(bindFunctions).toHaveBeenCalledWith(figure);
    expect(ready.mock.calls[0][0].detail).toEqual({ source: A, svg: '<svg>diagram</svg>' });
    expect(ready.mock.calls[0][0]).toMatchObject({ bubbles: true, composed: true });
    expect(host.querySelector('svg')?.textContent).toBe('diagram');
  });

  it('shows loading and ignores open until ready', async () => {
    let finish!: (value: { svg: string }) => void;

    mockRender.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { host, handle } = await createViewer();

    expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
    handle.open();
    expect(dialog()).toBeNull();
    finish({ svg: '<svg>ready</svg>' });
    await flushPromises();
    expect(host.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('reports an initial error and displays source as text', async () => {
    mockRender.mockRejectedValueOnce(new Error('bad syntax'));
    const { host, error } = await createViewer({ source: '<img src=x onerror=alert(1)>' });

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('bad syntax');
    expect(host.querySelector('pre')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(host.querySelector('img')).toBeNull();
    expect(error.mock.calls[0][0].detail).toMatchObject({ stage: 'render', retainedSvg: false });
  });

  it('rejects unsupported iframe output with a useful error', async () => {
    mockRender.mockResolvedValueOnce({ svg: '<iframe></iframe>' });
    const { host } = await createViewer();

    expect(host.textContent).toContain('inline SVG');
    expect(host.querySelector('iframe')).toBeNull();
  });

  it('ignores late results and tells queued render jobs when they are stale', async () => {
    let finish!: (value: { svg: string }) => void;

    mockRender.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { host, handle, ready } = await createViewer();
    const isCurrent = mockRender.mock.calls[0][2] as () => boolean;

    handle.update({ source: B, config: { theme: 'forest' } });
    await flushPromises();
    expect(isCurrent()).toBe(false);
    finish({ svg: '<svg>stale</svg>' });
    await flushPromises();
    expect(host.textContent).toBe('rendered');
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('keeps the last successful SVG/source together after a replacement fails', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const { host, handle, error, close } = await createViewer();

    handle.open();
    mockRender.mockRejectedValueOnce(new Error('invalid B'));
    handle.update({ source: B });
    expect(dialog()).toBeNull();
    expect(close).toHaveBeenCalledTimes(1);
    await flushPromises();
    expect(host.querySelector('svg')?.textContent).toBe('rendered');
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(error.mock.calls[0][0].detail.retainedSvg).toBe(true);
    handle.open();
    dialog().querySelector<HTMLButtonElement>('[aria-label="Copy diagram source"]')!.click();
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(A);
  });

  it('updates UI options and resets omitted fields without rendering or closing', async () => {
    const { figure, handle } = await createViewer({
      customization: {
        css: { '--mv-accent': '#cc00cc', '--mv-radius': '2rem' },
        labels: { close: 'Закрыть' },
      },
    });

    handle.open();
    const overlay = dialog();

    expect(overlay.style.getPropertyValue('--mv-radius')).toBe('2rem');
    handle.update({
      source: A,
      appearance: 'dark',
      customization: { css: { '--mv-accent': '#00cccc' } },
    });
    expect(overlay.isConnected).toBe(true);
    expect(overlay.style.getPropertyValue('--mv-accent')).toBe('#00cccc');
    expect(overlay.style.getPropertyValue('--mv-radius')).toBe('');
    expect(overlay.dataset.mvAppearance).toBe('dark');
    expect(overlay.querySelector('[aria-label="Close"]')).not.toBeNull();
    expect(figure.style.getPropertyValue('--mv-radius')).toBe('');
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('does not commit, bind or emit after destroy; update cannot revive the instance', async () => {
    let finish!: (value: { svg: string; bindFunctions: () => void }) => void;
    const bindFunctions = vi.fn();

    mockRender.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { host, handle, ready } = await createViewer();

    handle.destroy();
    handle.destroy();
    handle.update({ source: B });
    finish({ svg: '<svg>late</svg>', bindFunctions });
    await flushPromises();
    expect(host.childNodes).toHaveLength(0);
    expect(bindFunctions).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalledTimes(1);
  });
});

describe('DOM dialog controls', () => {
  it.each(['click', 'Enter', ' '])('opens from the accessible trigger: %s', async (action) => {
    const { figure } = await createViewer();

    if (action === 'click') figure.click();
    else figure.dispatchEvent(new KeyboardEvent('keydown', { key: action, bubbles: true }));

    expect(dialog()?.open).toBe(true);
  });

  it('leaves links and external-control-only diagrams alone', async () => {
    mockRender.mockResolvedValueOnce({ svg: '<svg><a href="#target"><text>link</text></a></svg>' });
    const { host, handle, figure } = await createViewer();

    host.querySelector('a')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dialog()).toBeNull();
    handle.update({ source: A, openOnDiagramClick: false });
    expect(figure.hasAttribute('tabindex')).toBe(false);
    figure.click();
    expect(dialog()).toBeNull();
    handle.open();
    expect(dialog()).not.toBeNull();
  });

  it('supports zoom, pan, reset and focus restoration', async () => {
    const { figure, handle } = await createViewer();

    figure.focus();
    handle.open();
    const content = dialog().querySelector<HTMLElement>('.mermaid-view-content')!;

    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
    expect(content.style.transform).toContain('scale(1.25)');
    expect(dialog().querySelector('output')?.textContent).toBe('125%');
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(content.style.transform).toContain('translate(-40px, 0px)');
    handle.reset();
    expect(content.style.transform).toBe('translate(0px, 0px) scale(1)');
    dialog().close();
    expect(document.activeElement).toBe(figure);
  });

  it('allows one active dialog per document and restores the original scroll style', async () => {
    document.body.style.overflow = 'scroll';
    const first = await createViewer();
    const second = await createViewer();

    first.handle.open();
    second.handle.open();
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
    expect(first.close).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('hidden');
    first.handle.destroy();
    expect(document.body.style.overflow).toBe('hidden');
    second.handle.destroy();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('hides optional controls and cancels native Escape', async () => {
    const { handle } = await createViewer({
      controls: { svg: false, png: false, copySource: false },
    });

    handle.open();

    for (const label of ['Download SVG', 'Download PNG', 'Copy diagram source']) {
      expect(dialog().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)?.hidden).toBe(
        true,
      );
    }

    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dialog()).toBeNull();
  });

  it('downloads SVG with the existing filename and revokes the blob URL', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:download');
    const revokeObjectURL = vi.fn();

    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { handle } = await createViewer({ id: 'my-diagram' });

    handle.open();
    vi.useFakeTimers();
    dialog().querySelector<HTMLButtonElement>('[aria-label="Download SVG"]')!.click();
    expect(createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/svg+xml' }),
    );
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('mermaid-my-diagram.svg');
    vi.advanceTimersByTime(10000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download');
  });

  it('reports clipboard errors but ignores late clipboard callbacks after destroy', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValueOnce(new Error('denied'));
    const { handle, error } = await createViewer();

    handle.open();
    dialog().querySelector<HTMLButtonElement>('[aria-label="Copy diagram source"]')!.click();
    await flushPromises();
    expect(error.mock.calls[0][0].detail.stage).toBe('clipboard');
    let finish!: () => void;

    writeText.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    dialog().querySelector<HTMLButtonElement>('[aria-label="Copy diagram source"]')!.click();
    handle.destroy();
    finish();
    await flushPromises();
    expect(error).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
  });
});
