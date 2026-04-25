import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, Suspense } from 'vue';
import { flushPromises } from './helpers/setup';
import mermaidConfig from './helpers/__mocks__/virtual-mermaid-config';

type ObserverCallback = (mutations: unknown[], observer: unknown) => void;

let observerCallback: ObserverCallback;
const observeSpy = vi.fn();
const disconnectSpy = vi.fn();

class MockMutationObserver {
  constructor(cb: ObserverCallback) {
    observerCallback = cb;
  }
  observe = observeSpy;
  disconnect = disconnectSpy;
}

vi.stubGlobal('MutationObserver', MockMutationObserver);

const mockRender = vi.fn().mockResolvedValue('<svg id="test-1">rendered</svg>');
const mockInit = vi.fn().mockResolvedValue(undefined);

vi.mock('../src/mermaid', () => ({
  render: (...args: unknown[]) => mockRender(...args),
  init: (...args: unknown[]) => mockInit(...args),
}));

vi.mock('vitepress', () => ({
  useData: () => ({
    page: ref({ frontmatter: {} }),
  }),
}));

/**
 * virtual:mermaid-config is resolved via alias in vitest.config.ts
 */

/**
 * Stub dialog methods not implemented in happy-dom
 */
// eslint-disable-next-line @typescript-eslint/unbound-method -- polyfill for happy-dom
HTMLDialogElement.prototype.showModal ??= vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
// eslint-disable-next-line @typescript-eslint/unbound-method -- polyfill for happy-dom
HTMLDialogElement.prototype.close ??= vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
});

import Mermaid from '../src/Mermaid.vue';

const GRAPH = encodeURIComponent('graph TD; A-->B');

const mountMermaid = async (
  props?: Record<string, unknown>,
  options?: { attachTo?: HTMLElement },
) => {
  const mermaidProps = {
    graph: GRAPH,
    id: 'test-1',
    ...props,
  };

  const Wrapper = defineComponent({
    setup() {
      return () =>
        h(Suspense, null, {
          default: () => h(Mermaid, mermaidProps),
        });
    },
  });

  const wrapper = mount(Wrapper, options);

  await flushPromises();

  return wrapper;
};

describe('Mermaid.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('renders SVG from mermaid.render()', async () => {
    const wrapper = await mountMermaid();

    expect(wrapper.html()).toContain('rendered');
  });

  it('applies default class "mermaid"', async () => {
    const wrapper = await mountMermaid();

    expect(wrapper.find('div').classes()).toContain('mermaid');
  });

  it('applies custom class prop', async () => {
    const wrapper = await mountMermaid({ class: 'custom' });

    expect(wrapper.find('div').classes()).toContain('custom');
  });

  it('calls init during mount', async () => {
    await mountMermaid();
    expect(mockInit).toHaveBeenCalled();
  });

  it('calls render with decoded graph and config', async () => {
    await mountMermaid();
    expect(mockRender).toHaveBeenCalledWith(
      'test-1',
      'graph TD; A-->B',
      expect.objectContaining({ securityLevel: 'loose' }),
    );
  });

  it('sets up MutationObserver on mount', async () => {
    await mountMermaid();
    expect(observeSpy).toHaveBeenCalledWith(
      document.documentElement,
      expect.objectContaining({ attributes: true, attributeFilter: ['class'] }),
    );
  });

  it('re-renders on dark mode toggle', async () => {
    await mountMermaid();
    mockRender.mockClear();

    document.documentElement.classList.add('dark');
    observerCallback([], {});
    await flushPromises();

    expect(mockRender).toHaveBeenCalledWith(
      'test-1',
      'graph TD; A-->B',
      expect.objectContaining({ theme: 'dark' }),
    );
  });

  it('does not re-render when class changes but dark state is same', async () => {
    await mountMermaid();
    mockRender.mockClear();

    document.documentElement.classList.add('some-other-class');
    observerCallback([], {});
    await flushPromises();

    expect(mockRender).not.toHaveBeenCalled();
  });

  it('disconnects MutationObserver on unmount', async () => {
    const wrapper = await mountMermaid();

    wrapper.unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('opens zoom dialog on click', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('click');

    const dialog = document.querySelector('dialog.mermaid-zoom-overlay');

    expect(dialog).toBeTruthy();

    dialog?.remove();
  });

  it('opens zoom dialog on Enter key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('keydown', { key: 'Enter' });

    const dialog = document.querySelector('dialog.mermaid-zoom-overlay');

    expect(dialog).toBeTruthy();

    dialog?.remove();
  });

  it('opens zoom dialog on Space key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('keydown', { key: ' ' });

    const dialog = document.querySelector('dialog.mermaid-zoom-overlay');

    expect(dialog).toBeTruthy();

    dialog?.remove();
  });

  it('zooms in on "+" key and updates aria-live output', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('click');

    const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
    const content = dialog.querySelector('.mermaid-zoom-content') as HTMLElement;
    const output = dialog.querySelector('output.mermaid-zoom-scale') as HTMLElement;

    expect(output.textContent).toBe('100%');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));

    expect(content.style.transform).toContain('scale(1.25)');
    expect(output.textContent).toBe('125%');

    dialog.remove();
  });

  it('zooms out on "-" key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('click');

    const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
    const content = dialog.querySelector('.mermaid-zoom-content') as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));

    expect(content.style.transform).toContain('scale(0.75)');

    dialog.remove();
  });

  it('resets transform on "0" key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('click');

    const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
    const content = dialog.querySelector('.mermaid-zoom-content') as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

    expect(content.style.transform).toBe('translate(0px, 0px) scale(1)');

    dialog.remove();
  });

  it('pans on arrow keys', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('click');

    const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
    const content = dialog.querySelector('.mermaid-zoom-content') as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(content.style.transform).toBe('translate(-40px, 0px) scale(1)');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

    expect(content.style.transform).toBe('translate(-40px, -40px) scale(1)');

    dialog.remove();
  });

  it('restores focus to trigger after dialog close', async () => {
    const wrapper = await mountMermaid({}, { attachTo: document.body });
    const trigger = wrapper.find('div').element as HTMLElement;

    trigger.focus();

    expect(document.activeElement).toBe(trigger);

    await wrapper.find('div').trigger('click');

    const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;

    dialog.close();

    expect(document.activeElement).toBe(trigger);

    wrapper.unmount();
  });

  describe('Download functionality', () => {
    let createObjectURLSpy: ReturnType<typeof vi.fn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
    let blobArgs: Array<{ parts: BlobPart[]; options?: BlobPropertyBag }>;
    let clickSpy: ReturnType<typeof vi.fn<() => void>>;

    beforeEach(() => {
      blobArgs = [];
      createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
      revokeObjectURLSpy = vi.fn();

      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: createObjectURLSpy,
        revokeObjectURL: revokeObjectURLSpy,
      });

      const OriginalBlob = globalThis.Blob;

      class MockBlob extends OriginalBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options);
          blobArgs.push({ parts, options });
        }
      }

      vi.stubGlobal('Blob', MockBlob);

      clickSpy = vi.fn<() => void>();

      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      vi.stubGlobal('MutationObserver', MockMutationObserver);
    });

    it('creates Blob with MIME type image/svg+xml on download', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector(
        'button[aria-label="Download SVG"]',
      ) as HTMLButtonElement;

      expect(downloadBtn).toBeTruthy();

      downloadBtn.click();

      expect(blobArgs).toHaveLength(1);
      expect(blobArgs[0].options).toEqual({ type: 'image/svg+xml' });

      dialog.remove();
    });

    it('uses filename matching pattern mermaid-{id}.svg', async () => {
      const capturedAnchors: HTMLAnchorElement[] = [];
      const origCreateElement = document.createElement.bind(document);

      vi.spyOn(document, 'createElement').mockImplementation(
        (tag: string, options?: ElementCreationOptions) => {
          const el = origCreateElement(tag, options);

          if (tag === 'a') {
            capturedAnchors.push(el as HTMLAnchorElement);
          }

          return el;
        },
      );

      const wrapper = await mountMermaid({ id: 'my-diagram' });

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector(
        'button[aria-label="Download SVG"]',
      ) as HTMLButtonElement;

      const anchorCountBefore = capturedAnchors.length;

      downloadBtn.click();

      const newAnchors = capturedAnchors.slice(anchorCountBefore);

      expect(newAnchors).toHaveLength(1);
      expect(newAnchors[0].download).toBe('mermaid-my-diagram.svg');

      dialog.remove();
    });

    it('calls URL.revokeObjectURL() after download', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector(
        'button[aria-label="Download SVG"]',
      ) as HTMLButtonElement;

      downloadBtn.click();

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

      dialog.remove();
    });
  });

  describe('Copy functionality', () => {
    let writeTextSpy: ReturnType<typeof vi.fn>;

    const flushMicrotasks = async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    };

    beforeEach(() => {
      writeTextSpy = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
        configurable: true,
      });
    });

    it('calls navigator.clipboard.writeText() with SVG source', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const copyBtn = dialog.querySelector('button[aria-label="Copy SVG"]') as HTMLButtonElement;

      expect(copyBtn).toBeTruthy();

      copyBtn.click();
      await flushPromises();

      expect(writeTextSpy).toHaveBeenCalledTimes(1);

      const calledWith = writeTextSpy.mock.calls[0][0] as string;

      expect(calledWith).toContain('<svg');
      expect(calledWith).toContain('</svg>');

      dialog.remove();
    });

    it('shows ✓ icon on success for 2 seconds then reverts to 📋', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const copyBtn = dialog.querySelector('button[aria-label="Copy SVG"]') as HTMLButtonElement;

      vi.useFakeTimers();

      copyBtn.click();
      await flushMicrotasks();

      expect(copyBtn.textContent).toBe('\u2713');
      expect(copyBtn.getAttribute('aria-label')).toBe('Copied');

      vi.advanceTimersByTime(2000);

      expect(copyBtn.textContent).toBe('\u2398');
      expect(copyBtn.getAttribute('aria-label')).toBe('Copy SVG');

      vi.useRealTimers();
      dialog.remove();
    });

    it('shows ✗ icon on error for 2 seconds then reverts to 📋', async () => {
      writeTextSpy.mockRejectedValue(new Error('denied'));

      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const copyBtn = dialog.querySelector('button[aria-label="Copy SVG"]') as HTMLButtonElement;

      vi.useFakeTimers();

      copyBtn.click();
      await flushMicrotasks();

      expect(copyBtn.textContent).toBe('\u2717');
      expect(copyBtn.getAttribute('aria-label')).toBe('Copy failed');

      vi.advanceTimersByTime(2000);

      expect(copyBtn.textContent).toBe('\u2398');
      expect(copyBtn.getAttribute('aria-label')).toBe('Copy SVG');

      vi.useRealTimers();
      dialog.remove();
    });
  });

  describe('Controls panel and options', () => {
    afterEach(() => {
      /**
       * Reset mock config to defaults
       */
      delete (mermaidConfig as Record<string, unknown>).download;
      delete (mermaidConfig as Record<string, unknown>).copy;
    });

    it('both buttons appear in controls panel by default', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');
      const copyBtn = dialog.querySelector('button[aria-label="Copy SVG"]');

      expect(downloadBtn).toBeTruthy();
      expect(copyBtn).toBeTruthy();

      dialog.remove();
    });

    it('Download button has aria-label="Download SVG"', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');

      expect(downloadBtn).toBeTruthy();
      expect(downloadBtn!.getAttribute('aria-label')).toBe('Download SVG');

      dialog.remove();
    });

    it('Copy button has aria-label="Copy SVG"', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const copyBtn = dialog.querySelector('button[aria-label="Copy SVG"]');

      expect(copyBtn).toBeTruthy();
      expect(copyBtn!.getAttribute('aria-label')).toBe('Copy SVG');

      dialog.remove();
    });

    it('buttons use CSS class mermaid-zoom-btn', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');
      const copyBtn = dialog.querySelector('button[aria-label="Copy SVG"]');

      expect(downloadBtn!.classList.contains('mermaid-zoom-btn')).toBe(true);
      expect(copyBtn!.classList.contains('mermaid-zoom-btn')).toBe(true);

      dialog.remove();
    });

    it('download: false hides Download button', async () => {
      (mermaidConfig as Record<string, unknown>).download = false;

      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');
      const copyBtn = dialog.querySelector('button[aria-label="Copy SVG"]');

      expect(downloadBtn).toBeNull();
      expect(copyBtn).toBeTruthy();

      dialog.remove();
    });

    it('copy: false hides Copy button', async () => {
      (mermaidConfig as Record<string, unknown>).copy = false;

      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');
      const copyBtn = dialog.querySelector('button[aria-label="Copy SVG"]');

      expect(downloadBtn).toBeTruthy();
      expect(copyBtn).toBeNull();

      dialog.remove();
    });

    it('Copy button has aria-live="polite"', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');

      const dialog = document.querySelector('dialog.mermaid-zoom-overlay') as HTMLDialogElement;
      const copyBtn = dialog.querySelector('button[aria-label="Copy SVG"]');

      expect(copyBtn!.getAttribute('aria-live')).toBe('polite');

      dialog.remove();
    });
  });
});
