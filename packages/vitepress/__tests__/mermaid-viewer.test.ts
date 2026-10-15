import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, Suspense } from 'vue';
import { flushPromises } from './helpers/setup';
import mermaidConfig from './helpers/__mocks__/virtual-mermaid-config';

type ObserverCallback = (mutations: unknown[], observer: unknown) => void;

let _observerCallback: ObserverCallback;
const observeSpy = vi.fn();
const disconnectSpy = vi.fn();

class MockMutationObserver {
  constructor(cb: ObserverCallback) {
    _observerCallback = cb;
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

const DEFAULT_CLASS = 'mermaid';

const SELECTORS = {
  container: `.${DEFAULT_CLASS}`,
  overlay: 'dialog.mermaid-view-overlay',
  content: '.mermaid-view-content',
  scale: 'output.mermaid-view-scale',
  btnSvg: 'button[aria-label="Download SVG"]',
  btnPng: 'button[aria-label="Download PNG"]',
  btnCopy: 'button[aria-label="Copy diagram source"]',
} as const;

const getViewerDialog = () => document.querySelector<HTMLDialogElement>(SELECTORS.overlay)!;

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

describe('MermaidViewer.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('opens zoom dialog on click', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find(SELECTORS.container).trigger('click');
    await flushPromises();

    const dialog = getViewerDialog();

    expect(dialog).toBeTruthy();

    wrapper.unmount();
  });

  it('opens zoom dialog on Enter key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find(SELECTORS.container).trigger('keydown', { key: 'Enter' });
    await flushPromises();

    const dialog = getViewerDialog();

    expect(dialog).toBeTruthy();

    wrapper.unmount();
  });

  it('opens zoom dialog on Space key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find(SELECTORS.container).trigger('keydown', { key: ' ' });
    await flushPromises();

    const dialog = getViewerDialog();

    expect(dialog).toBeTruthy();

    wrapper.unmount();
  });

  it('zooms in on "+" key and updates aria-live output', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find(SELECTORS.container).trigger('click');
    await flushPromises();

    const dialog = getViewerDialog();
    const content = dialog.querySelector(SELECTORS.content) as HTMLElement;
    const output = dialog.querySelector(SELECTORS.scale) as HTMLElement;

    expect(output.textContent?.trim()).toBe('100%');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
    await flushPromises();

    expect(content.style.transform).toContain('scale(1.25)');
    expect(output.textContent?.trim()).toBe('125%');

    wrapper.unmount();
  });

  it('zooms out on "-" key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find(SELECTORS.container).trigger('click');
    await flushPromises();

    const dialog = getViewerDialog();
    const content = dialog.querySelector(SELECTORS.content) as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));
    await flushPromises();

    expect(content.style.transform).toContain('scale(0.75)');

    wrapper.unmount();
  });

  it('resets transform on "0" key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find(SELECTORS.container).trigger('click');
    await flushPromises();

    const dialog = getViewerDialog();
    const content = dialog.querySelector(SELECTORS.content) as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
    await flushPromises();

    expect(content.style.transform).toBe('translate(0px, 0px) scale(1)');

    wrapper.unmount();
  });

  it('pans on arrow keys', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find(SELECTORS.container).trigger('click');
    await flushPromises();

    const dialog = getViewerDialog();
    const content = dialog.querySelector(SELECTORS.content) as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await flushPromises();

    expect(content.style.transform).toBe('translate(-40px, 0px) scale(1)');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await flushPromises();

    expect(content.style.transform).toBe('translate(-40px, -40px) scale(1)');

    wrapper.unmount();
  });

  it('restores focus to trigger after dialog close', async () => {
    const wrapper = await mountMermaid({}, { attachTo: document.body });
    const trigger = wrapper.find(SELECTORS.container).element as HTMLElement;

    trigger.focus();

    expect(document.activeElement).toBe(trigger);

    await wrapper.find(SELECTORS.container).trigger('click');
    await flushPromises();

    const dialog = getViewerDialog();

    dialog.close();
    await flushPromises();

    expect(document.activeElement).toBe(trigger);

    wrapper.unmount();
  });

  it('skips focus restoration when previousActive was removed from DOM', async () => {
    const wrapper = await mountMermaid({}, { attachTo: document.body });

    const tempBtn = document.createElement('button');

    document.body.appendChild(tempBtn);
    tempBtn.focus();

    await wrapper.find(SELECTORS.container).trigger('click');
    await flushPromises();

    const focusSpy = vi.spyOn(tempBtn, 'focus');

    tempBtn.remove();

    const dialog = getViewerDialog();

    dialog.close();
    await flushPromises();

    expect(focusSpy).not.toHaveBeenCalled();

    focusSpy.mockRestore();
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

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const downloadBtn = dialog.querySelector(SELECTORS.btnSvg) as HTMLButtonElement;

      expect(downloadBtn).toBeTruthy();

      downloadBtn.click();

      expect(blobArgs).toHaveLength(1);
      expect(blobArgs[0].options).toEqual({ type: 'image/svg+xml' });

      wrapper.unmount();
    });

    it('uses filename matching pattern mermaid-{id}.svg', async () => {
      const wrapper = await mountMermaid({ id: 'my-diagram' });

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const downloadBtn = dialog.querySelector(SELECTORS.btnSvg) as HTMLButtonElement;

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

      downloadBtn.click();

      expect(capturedAnchors).toHaveLength(1);
      expect(capturedAnchors[0].download).toBe('mermaid-my-diagram.svg');

      wrapper.unmount();
    });

    it('calls URL.revokeObjectURL() after download', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const downloadBtn = dialog.querySelector(SELECTORS.btnSvg) as HTMLButtonElement;

      vi.useFakeTimers();

      downloadBtn.click();

      vi.advanceTimersByTime(10_000);

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

      vi.useRealTimers();
      wrapper.unmount();
    });
  });

  describe('Controls panel and options', () => {
    afterEach(() => {
      delete (mermaidConfig as Record<string, unknown>).download;
      delete (mermaidConfig as Record<string, unknown>).downloadPng;
    });

    it('both action buttons appear in controls panel by default', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const downloadBtn = dialog.querySelector(SELECTORS.btnSvg);
      const downloadPngBtn = dialog.querySelector(SELECTORS.btnPng);

      expect(downloadBtn).toBeTruthy();
      expect(downloadPngBtn).toBeTruthy();

      wrapper.unmount();
    });

    it('Download button has aria-label="Download SVG"', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const downloadBtn = dialog.querySelector(SELECTORS.btnSvg);

      expect(downloadBtn).toBeTruthy();
      expect(downloadBtn!.getAttribute('aria-label')).toBe('Download SVG');

      wrapper.unmount();
    });

    it('Download PNG button has aria-label="Download PNG"', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const downloadPngBtn = dialog.querySelector(SELECTORS.btnPng);

      expect(downloadPngBtn).toBeTruthy();
      expect(downloadPngBtn!.getAttribute('aria-label')).toBe('Download PNG');

      wrapper.unmount();
    });

    it('action buttons use CSS class mermaid-view-btn', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const downloadBtn = dialog.querySelector(SELECTORS.btnSvg);
      const downloadPngBtn = dialog.querySelector(SELECTORS.btnPng);

      expect(downloadBtn!.classList.contains('mermaid-view-btn')).toBe(true);
      expect(downloadPngBtn!.classList.contains('mermaid-view-btn')).toBe(true);

      wrapper.unmount();
    });

    it('download: false hides Download SVG button', async () => {
      (mermaidConfig as Record<string, unknown>).download = false;

      const wrapper = await mountMermaid();

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const downloadBtn = dialog.querySelector(SELECTORS.btnSvg);
      const downloadPngBtn = dialog.querySelector(SELECTORS.btnPng);

      expect(downloadBtn).toBeNull();
      expect(downloadPngBtn).toBeTruthy();

      wrapper.unmount();
    });

    it('downloadPng: false hides Download PNG button', async () => {
      (mermaidConfig as Record<string, unknown>).downloadPng = false;

      const wrapper = await mountMermaid();

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const downloadBtn = dialog.querySelector(SELECTORS.btnSvg);
      const downloadPngBtn = dialog.querySelector(SELECTORS.btnPng);

      expect(downloadBtn).toBeTruthy();
      expect(downloadPngBtn).toBeNull();

      wrapper.unmount();
    });

    it('copies diagram source code to clipboard on Copy button click', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);

      vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextSpy);

      const wrapper = await mountMermaid();

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      const dialog = getViewerDialog();
      const copyBtn = dialog.querySelector(SELECTORS.btnCopy) as HTMLButtonElement;

      expect(copyBtn).toBeTruthy();

      copyBtn.click();
      await flushPromises();

      expect(writeTextSpy).toHaveBeenCalledWith('graph TD; A-->B');

      vi.restoreAllMocks();
      wrapper.unmount();
    });
  });
});
