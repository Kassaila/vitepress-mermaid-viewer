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
});
