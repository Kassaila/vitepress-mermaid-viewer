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
    await flushPromises();

    const dialog = document.querySelector('dialog.mermaid-view-overlay');

    expect(dialog).toBeTruthy();

    wrapper.unmount();
  });

  it('opens zoom dialog on Enter key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('keydown', { key: 'Enter' });
    await flushPromises();

    const dialog = document.querySelector('dialog.mermaid-view-overlay');

    expect(dialog).toBeTruthy();

    wrapper.unmount();
  });

  it('opens zoom dialog on Space key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('keydown', { key: ' ' });
    await flushPromises();

    const dialog = document.querySelector('dialog.mermaid-view-overlay');

    expect(dialog).toBeTruthy();

    wrapper.unmount();
  });

  it('zooms in on "+" key and updates aria-live output', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('click');
    await flushPromises();

    const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
    const content = dialog.querySelector('.mermaid-view-content') as HTMLElement;
    const output = dialog.querySelector('output.mermaid-view-scale') as HTMLElement;

    expect(output.textContent?.trim()).toBe('100%');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
    await flushPromises();

    expect(content.style.transform).toContain('scale(1.25)');
    expect(output.textContent?.trim()).toBe('125%');

    wrapper.unmount();
  });

  it('zooms out on "-" key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('click');
    await flushPromises();

    const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
    const content = dialog.querySelector('.mermaid-view-content') as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));

    expect(content.style.transform).toContain('scale(0.75)');

    wrapper.unmount();
  });

  it('resets transform on "0" key', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('click');
    await flushPromises();

    const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
    const content = dialog.querySelector('.mermaid-view-content') as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));

    expect(content.style.transform).toBe('translate(0px, 0px) scale(1)');

    wrapper.unmount();
  });

  it('pans on arrow keys', async () => {
    const wrapper = await mountMermaid();

    await wrapper.find('div').trigger('click');
    await flushPromises();

    const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
    const content = dialog.querySelector('.mermaid-view-content') as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(content.style.transform).toBe('translate(-40px, 0px) scale(1)');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    expect(content.style.transform).toBe('translate(-40px, -40px) scale(1)');

    wrapper.unmount();
  });

  it('restores focus to trigger after dialog close', async () => {
    const wrapper = await mountMermaid({}, { attachTo: document.body });
    const trigger = wrapper.find('div').element as HTMLElement;

    trigger.focus();

    expect(document.activeElement).toBe(trigger);

    await wrapper.find('div').trigger('click');
    await flushPromises();

    const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;

    dialog.close();
    await flushPromises();

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
      await flushPromises();

      const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector(
        'button[aria-label="Download SVG"]',
      ) as HTMLButtonElement;

      expect(downloadBtn).toBeTruthy();

      downloadBtn.click();

      expect(blobArgs).toHaveLength(1);
      expect(blobArgs[0].options).toEqual({ type: 'image/svg+xml' });

      wrapper.unmount();
    });

    it('uses filename matching pattern mermaid-{id}.svg', async () => {
      const wrapper = await mountMermaid({ id: 'my-diagram' });

      await wrapper.find('div').trigger('click');
      await flushPromises();

      const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector(
        'button[aria-label="Download SVG"]',
      ) as HTMLButtonElement;

      /**
       * Spy on document.createElement only right before the download click
       * to avoid capturing Vue's internal createElement calls during mount.
       */
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

      await wrapper.find('div').trigger('click');
      await flushPromises();

      const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector(
        'button[aria-label="Download SVG"]',
      ) as HTMLButtonElement;

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
      /**
       * Reset mock config to defaults
       */
      delete (mermaidConfig as Record<string, unknown>).download;
      delete (mermaidConfig as Record<string, unknown>).downloadPng;
    });

    it('both action buttons appear in controls panel by default', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');
      await flushPromises();

      const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');
      const downloadPngBtn = dialog.querySelector('button[aria-label="Download PNG"]');

      expect(downloadBtn).toBeTruthy();
      expect(downloadPngBtn).toBeTruthy();

      wrapper.unmount();
    });

    it('Download button has aria-label="Download SVG"', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');
      await flushPromises();

      const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');

      expect(downloadBtn).toBeTruthy();
      expect(downloadBtn!.getAttribute('aria-label')).toBe('Download SVG');

      wrapper.unmount();
    });

    it('Download PNG button has aria-label="Download PNG"', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');
      await flushPromises();

      const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
      const downloadPngBtn = dialog.querySelector('button[aria-label="Download PNG"]');

      expect(downloadPngBtn).toBeTruthy();
      expect(downloadPngBtn!.getAttribute('aria-label')).toBe('Download PNG');

      wrapper.unmount();
    });

    it('action buttons use CSS class mermaid-view-btn', async () => {
      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');
      await flushPromises();

      const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');
      const downloadPngBtn = dialog.querySelector('button[aria-label="Download PNG"]');

      expect(downloadBtn!.classList.contains('mermaid-view-btn')).toBe(true);
      expect(downloadPngBtn!.classList.contains('mermaid-view-btn')).toBe(true);

      wrapper.unmount();
    });

    it('download: false hides Download SVG button', async () => {
      (mermaidConfig as Record<string, unknown>).download = false;

      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');
      await flushPromises();

      const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');
      const downloadPngBtn = dialog.querySelector('button[aria-label="Download PNG"]');

      expect(downloadBtn).toBeNull();
      expect(downloadPngBtn).toBeTruthy();

      wrapper.unmount();
    });

    it('downloadPng: false hides Download PNG button', async () => {
      (mermaidConfig as Record<string, unknown>).downloadPng = false;

      const wrapper = await mountMermaid();

      await wrapper.find('div').trigger('click');
      await flushPromises();

      const dialog = document.querySelector('dialog.mermaid-view-overlay') as HTMLDialogElement;
      const downloadBtn = dialog.querySelector('button[aria-label="Download SVG"]');
      const downloadPngBtn = dialog.querySelector('button[aria-label="Download PNG"]');

      expect(downloadBtn).toBeTruthy();
      expect(downloadPngBtn).toBeNull();

      wrapper.unmount();
    });
  });

  describe('Loading and error states', () => {
    it('shows skeleton with aria-busy while render is pending', async () => {
      let resolveRender!: (svg: string) => void;

      mockRender.mockImplementationOnce(() => new Promise<string>((res) => (resolveRender = res)));

      const wrapper = await mountMermaid();

      expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
      expect(wrapper.find('[role="button"]').exists()).toBe(false);
      expect(wrapper.find('div').classes()).toContain('mermaid--loading');

      resolveRender('<svg id="ok">ok</svg>');
      await flushPromises();

      expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false);
      expect(wrapper.find('[role="button"]').exists()).toBe(true);
      expect(wrapper.html()).toContain('<svg id="ok">ok</svg>');

      wrapper.unmount();
    });

    it('skeleton uses BEM modifier of provided class', async () => {
      let resolveRender!: (svg: string) => void;

      mockRender.mockImplementationOnce(() => new Promise<string>((res) => (resolveRender = res)));

      const wrapper = await mountMermaid({ class: 'custom-diagram' });
      const classes = wrapper.find('div').classes();

      expect(classes).toContain('custom-diagram');
      expect(classes).toContain('custom-diagram--loading');

      resolveRender('<svg>ok</svg>');
      await flushPromises();
      wrapper.unmount();
    });

    it('shows alert with error message and source when initial render rejects', async () => {
      mockRender.mockRejectedValueOnce(new Error('bad syntax'));

      const wrapper = await mountMermaid();

      const alert = wrapper.find('[role="alert"]');

      expect(alert.exists()).toBe(true);
      expect(alert.classes()).toContain('mermaid--error');
      expect(wrapper.text()).toContain('bad syntax');
      expect(wrapper.find('pre').text()).toBe('graph TD; A-->B');

      wrapper.unmount();
    });

    it('keeps previous SVG and does not show alert when re-render fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockRender.mockResolvedValueOnce('<svg id="v1">v1</svg>');

      const wrapper = await mountMermaid();

      expect(wrapper.html()).toContain('<svg id="v1">v1</svg>');

      mockRender.mockRejectedValueOnce(new Error('flake'));
      document.documentElement.classList.add('dark');
      observerCallback([], {});
      await flushPromises();

      expect(wrapper.html()).toContain('<svg id="v1">v1</svg>');
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
      wrapper.unmount();
    });

    it('shows skeleton on theme switch and applies new SVG on resolve', async () => {
      mockRender.mockResolvedValueOnce('<svg id="light">light</svg>');

      const wrapper = await mountMermaid();

      expect(wrapper.html()).toContain('<svg id="light">light</svg>');

      let resolveRerender!: (svg: string) => void;

      mockRender.mockImplementationOnce(
        () => new Promise<string>((res) => (resolveRerender = res)),
      );

      document.documentElement.classList.add('dark');
      observerCallback([], {});
      await flushPromises();

      expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
      expect(wrapper.html()).not.toContain('<svg id="light">light</svg>');

      resolveRerender('<svg id="dark">dark</svg>');
      await flushPromises();

      expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false);
      expect(wrapper.html()).toContain('<svg id="dark">dark</svg>');

      wrapper.unmount();
    });
  });
});
