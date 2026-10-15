import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { h, ref, Suspense } from 'vue';
import { flushPromises } from './helpers/setup';
import Mermaid from '../src/Mermaid.vue';
import settings from './helpers/__mocks__/virtual-mermaid-config';

const frontmatter = ref<Record<string, unknown>>({});
const isDark = ref(false);

vi.mock('vitepress', () => ({ useData: () => ({ isDark, frontmatter }) }));
vi.mock('vue-mermaid-viewer', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    MermaidViewer: defineComponent({
      name: 'StandaloneMermaidViewer',
      props: {
        source: { type: String, required: true },
        id: { type: String, required: true },
        config: { type: Object, required: true },
        appearance: { type: String, required: true },
        customization: { type: Object, default: undefined },
        controls: { type: Object, required: true },
      },
      setup: () => () => h('div'),
    }),
  };
});

const mountMermaid = async () => {
  const wrapper = mount({
    setup: () => () =>
      h(Suspense, null, {
        default: () =>
          h(Mermaid, {
            graph: encodeURIComponent('graph TD; A-->B'),
            id: 'legacy-id',
            class: 'custom-diagram',
          }),
      }),
  });

  await flushPromises();

  return wrapper;
};

describe('VitePress Mermaid adapter', () => {
  beforeEach(() => {
    frontmatter.value = {};
    isDark.value = false;
  });

  it('preserves legacy encoded graph, id, class and default options', async () => {
    const wrapper = await mountMermaid();
    const child = wrapper.findComponent({ name: 'StandaloneMermaidViewer' });

    expect(child.props('source')).toBe('graph TD; A-->B');
    expect(child.props('id')).toBe('legacy-id');
    expect(child.attributes('class')).toContain('custom-diagram');
    expect(child.props('config')).toMatchObject({ securityLevel: 'loose', startOnLoad: false });
    wrapper.unmount();
  });

  it('updates diagram theme on VitePress dark mode and gives frontmatter precedence', async () => {
    const wrapper = await mountMermaid();
    const child = wrapper.findComponent({ name: 'StandaloneMermaidViewer' });

    isDark.value = true;
    await wrapper.vm.$nextTick();
    expect(child.props('config').theme).toBe('dark');
    expect(child.props('appearance')).toBe('dark');

    frontmatter.value = { mermaidTheme: 'forest' };
    await wrapper.vm.$nextTick();
    expect(child.props('config').theme).toBe('forest');

    isDark.value = false;
    await wrapper.vm.$nextTick();
    expect(child.props('config').theme).toBe('forest');
    wrapper.unmount();
  });

  it('keeps viewer customization and controls out of Mermaid configuration', async () => {
    const customized = settings as typeof settings & {
      viewer?: { css: { '--mv-accent': string } };
    };

    customized.viewer = { css: { '--mv-accent': '#ff00ff' } };
    customized.download = false;
    const wrapper = await mountMermaid();
    const child = wrapper.findComponent({ name: 'StandaloneMermaidViewer' });

    expect(child.props('customization')).toEqual(customized.viewer);
    expect(child.props('controls').svg).toBe(false);
    expect(child.props('config')).not.toHaveProperty('viewer');
    expect(child.props('config')).not.toHaveProperty('download');
    delete customized.viewer;
    customized.download = true;

    wrapper.unmount();
  });
});
