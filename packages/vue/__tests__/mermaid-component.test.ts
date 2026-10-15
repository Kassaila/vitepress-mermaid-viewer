import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import MermaidViewer from '../src/MermaidViewer.vue';
import { flushPromises } from './helpers/setup';

const { mountViewer, handle } = vi.hoisted(() => ({
  mountViewer: vi.fn(),
  handle: { update: vi.fn(), open: vi.fn(), close: vi.fn(), reset: vi.fn(), destroy: vi.fn() },
}));

vi.mock('@kassaila/mermaid-viewer', () => ({
  mountViewer,
  defaultViewerLabels: { loading: 'Loading diagram' },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  mountViewer.mockReturnValue(handle);
});

describe('Vue lifecycle adapter', () => {
  it('hands an empty host and raw props to the DOM viewer while forwarding attributes', async () => {
    const config = { theme: 'forest' as const };
    const wrapper = mount(MermaidViewer, {
      props: { source: 'graph TD; A-->B', config },
      attrs: { 'class': 'custom', 'data-test': 'diagram' },
    });

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    await flushPromises();
    expect(mountViewer).toHaveBeenCalledTimes(1);
    expect(mountViewer.mock.calls[0][0]).toBe(wrapper.element);
    expect(wrapper.element.children).toHaveLength(0);
    expect(mountViewer.mock.calls[0][1]).toMatchObject({
      source: 'graph TD; A-->B',
      config,
      openOnDiagramClick: true,
    });
    expect(wrapper.classes()).toContain('custom');
    expect(wrapper.attributes('data-test')).toBe('diagram');
  });

  it('forwards replacements, UI options and exposed commands', async () => {
    const wrapper = mount(MermaidViewer, { props: { source: 'A' } });

    await flushPromises();
    await wrapper.setProps({
      source: 'B',
      config: { theme: 'dark' },
      customization: { labels: { close: 'Закрыть' } },
    });
    expect(handle.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: 'B', config: { theme: 'dark' } }),
    );
    wrapper.vm.open();
    wrapper.vm.close();
    wrapper.vm.reset();
    expect(handle.open).toHaveBeenCalledTimes(1);
    expect(handle.close).toHaveBeenCalledTimes(1);
    expect(handle.reset).toHaveBeenCalledTimes(1);
  });

  it('translates DOM events into typed Vue emits and disconnects them on unmount', async () => {
    const onReady = vi.fn();
    const wrapper = mount(MermaidViewer, { props: { source: 'A', onReady } });

    await flushPromises();
    const host = wrapper.element;
    const ready = { source: 'A', svg: '<svg/>' };
    const error = { stage: 'render', cause: new Error('failed'), retainedSvg: true };

    for (const [name, detail] of [
      ['ready', ready],
      ['error', error],
      ['open', undefined],
      ['close', undefined],
    ] as const) {
      host.dispatchEvent(new CustomEvent(`mermaid-viewer:${name}`, { detail }));
    }

    expect(wrapper.emitted('ready')).toEqual([[ready]]);
    expect(wrapper.emitted('error')).toEqual([[error]]);
    expect(wrapper.emitted('open')).toEqual([[]]);
    wrapper.unmount();
    host.dispatchEvent(new CustomEvent('mermaid-viewer:ready', { detail: ready }));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(handle.destroy).toHaveBeenCalledTimes(1);
  });

  it('does not create a runtime if removed before the first mount tick', async () => {
    const wrapper = mount(MermaidViewer, { props: { source: 'A' } });

    wrapper.unmount();
    await flushPromises();
    expect(mountViewer).not.toHaveBeenCalled();
  });
});
