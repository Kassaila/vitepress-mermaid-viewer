import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import type { RenderResult } from 'mermaid';
import MermaidViewer from '../src/MermaidViewer.vue';
import { flushPromises } from './helpers/setup';

const { mockRender } = vi.hoisted(() => ({ mockRender: vi.fn() }));

vi.mock('../src/mermaid', () => ({ render: mockRender }));
enableAutoUnmount(afterEach);

const A = 'graph TD; A-->B';
const B = 'graph TD; C-->D';

beforeEach(() => {
  mockRender.mockReset().mockResolvedValue({ svg: '<svg id="test">rendered</svg>' });
});

const createViewer = async (props = {}) => {
  const wrapper = mount(MermaidViewer, { props: { source: A, ...props }, attachTo: document.body });

  await flushPromises();

  return wrapper;
};

describe('standalone Vue viewer', () => {
  it('renders raw source, forwards attributes and binds diagram interactions', async () => {
    const bindFunctions = vi.fn();

    mockRender.mockResolvedValueOnce({ svg: '<svg>diagram</svg>', bindFunctions });
    const wrapper = await createViewer({ 'class': 'custom', 'data-test': 'diagram' });

    expect(mockRender).toHaveBeenCalledWith(A, {});
    expect(wrapper.find('figure').classes()).toContain('custom');
    expect(wrapper.find('figure').attributes('data-test')).toBe('diagram');
    expect(bindFunctions).toHaveBeenCalledWith(wrapper.find('figure').element);
    expect(wrapper.emitted('ready')?.[0]).toEqual([{ source: A, svg: '<svg>diagram</svg>' }]);
  });

  it('shows an accessible loading state and then the rendered diagram', async () => {
    let finish!: (result: RenderResult) => void;

    mockRender.mockImplementationOnce(
      () =>
        new Promise<RenderResult>((resolve) => {
          finish = resolve;
        }),
    );
    const wrapper = await createViewer();

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    wrapper.vm.open();
    expect(document.querySelector('dialog')).toBeNull();
    finish({ svg: '<svg>ready</svg>', diagramType: 'flowchart' });
    await flushPromises();
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false);
    expect(wrapper.text()).toBe('ready');
  });

  it('reports an initial rendering failure with the source', async () => {
    mockRender.mockRejectedValueOnce(new Error('bad syntax'));
    const wrapper = await createViewer();

    expect(wrapper.find('[role="alert"]').text()).toContain('bad syntax');
    expect(wrapper.find('pre').text()).toBe(A);
    expect(wrapper.emitted('error')?.[0]).toEqual([
      expect.objectContaining({ stage: 'render', retainedSvg: false }),
    ]);
  });

  it('renders source/config replacements and ignores late results from older requests', async () => {
    let finishOld!: (result: RenderResult) => void;

    mockRender.mockImplementationOnce(
      () =>
        new Promise<RenderResult>((resolve) => {
          finishOld = resolve;
        }),
    );
    const wrapper = await createViewer();

    mockRender.mockResolvedValueOnce({ svg: '<svg>new</svg>' });
    await wrapper.setProps({ source: B, config: { theme: 'forest' } });
    await flushPromises();
    expect(mockRender).toHaveBeenLastCalledWith(B, { theme: 'forest' });

    finishOld({ svg: '<svg>old</svg>', diagramType: 'flowchart' });
    await flushPromises();
    expect(wrapper.text()).toBe('new');
    expect(wrapper.emitted('ready')).toHaveLength(1);
  });

  it('closes an open dialog before rendering a replacement', async () => {
    const wrapper = await createViewer();

    wrapper.vm.open();
    await flushPromises();
    expect(document.querySelector('dialog')).not.toBeNull();
    mockRender.mockImplementationOnce(() => new Promise(() => {}));
    await wrapper.setProps({ source: B });
    await flushPromises();
    expect(document.querySelector('dialog')).toBeNull();
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it('keeps the last successful SVG and source together when a replacement fails', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const wrapper = await createViewer();

    mockRender.mockRejectedValueOnce(new Error('invalid B'));
    await wrapper.setProps({ source: B });
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('svg').text()).toBe('rendered');
    expect(wrapper.emitted('error')?.[0]).toEqual([expect.objectContaining({ retainedSvg: true })]);

    wrapper.vm.open();
    await flushPromises();
    document.querySelector<HTMLButtonElement>('[aria-label="Copy diagram source"]')!.click();
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(A);
    writeText.mockRestore();
  });

  it('updates CSS and JS customization in the diagram and teleported dialog without rendering again', async () => {
    const wrapper = await createViewer({
      customization: {
        css: { '--mv-accent': '#cc00cc', '--mv-radius': '2rem' },
        labels: { trigger: 'Открыть диаграмму', close: 'Закрыть' },
      },
    });

    expect(wrapper.find('figure').attributes('aria-label')).toBe('Открыть диаграмму');
    expect(
      (wrapper.find('figure').element as HTMLElement).style.getPropertyValue('--mv-accent'),
    ).toBe('#cc00cc');
    wrapper.vm.open();
    await flushPromises();
    const dialog = document.querySelector<HTMLDialogElement>('dialog')!;

    expect(dialog.style.getPropertyValue('--mv-radius')).toBe('2rem');
    expect(dialog.querySelector('[aria-label="Закрыть"]')).not.toBeNull();

    await wrapper.setProps({
      appearance: 'dark',
      customization: {
        css: { '--mv-accent': '#00cccc' },
        labels: { close: 'Close it' },
      },
    });
    expect(dialog.isConnected).toBe(true);
    expect(dialog.style.getPropertyValue('--mv-accent')).toBe('#00cccc');
    expect(dialog.style.getPropertyValue('--mv-radius')).toBe('');
    expect(dialog.dataset.mvAppearance).toBe('dark');
    expect(dialog.querySelector('[aria-label="Close it"]')).not.toBeNull();
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('does not emit or bind DOM after unmount during a pending render', async () => {
    let finish!: (result: RenderResult) => void;
    const bindFunctions = vi.fn();

    mockRender.mockImplementationOnce(
      () =>
        new Promise<RenderResult>((resolve) => {
          finish = resolve;
        }),
    );
    const wrapper = await createViewer();

    wrapper.unmount();
    finish({ svg: '<svg>late</svg>', diagramType: 'flowchart', bindFunctions });
    await flushPromises();
    expect(bindFunctions).not.toHaveBeenCalled();
    expect(wrapper.emitted('ready')).toBeUndefined();
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('restores body overflow only after the last dialog is destroyed', async () => {
    document.body.style.overflow = 'scroll';
    const first = await createViewer();
    const second = await createViewer();

    first.vm.open();
    second.vm.open();
    await flushPromises();
    expect(document.body.style.overflow).toBe('hidden');
    first.unmount();
    expect(document.body.style.overflow).toBe('hidden');
    second.unmount();
    expect(document.body.style.overflow).toBe('scroll');

    document.body.style.overflow = '';
  });
});
