import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, Suspense } from 'vue';
import { flushPromises } from './helpers/setup';

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
} as const;

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

    expect(wrapper.find(SELECTORS.container).classes()).toContain('mermaid');
  });

  it('applies custom class prop', async () => {
    const wrapper = await mountMermaid({ class: 'custom' });

    expect(wrapper.find('figure').classes()).toContain('custom');
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

  describe('Loading and error states', () => {
    it('shows skeleton with aria-busy while render is pending', async () => {
      let resolveRender!: (svg: string) => void;

      mockRender.mockImplementationOnce(() => new Promise<string>((res) => (resolveRender = res)));

      const wrapper = await mountMermaid();

      expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
      expect(wrapper.find('[role="button"]').exists()).toBe(false);
      expect(wrapper.find(SELECTORS.container).classes()).toContain('mermaid--loading');

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

    it('closes viewer when re-render fails while viewer is open', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockRender.mockResolvedValueOnce('<svg id="v1">v1</svg>');

      const wrapper = await mountMermaid();

      await wrapper.find(SELECTORS.container).trigger('click');
      await flushPromises();

      expect(document.querySelector(SELECTORS.overlay)).toBeTruthy();

      mockRender.mockRejectedValueOnce(new Error('flake'));
      document.documentElement.classList.add('dark');
      observerCallback([], {});
      await flushPromises();

      expect(wrapper.html()).toContain('<svg id="v1">v1</svg>');
      expect(document.querySelector(SELECTORS.overlay)).toBeNull();
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
