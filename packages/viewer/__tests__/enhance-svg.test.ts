import { afterEach, describe, expect, it, vi } from 'vitest';
import { enhanceSvg } from '../src/enhance-svg';
import { flushPromises } from './helpers/setup';
import type { SvgViewerOptions, ViewerHandle } from '../src/types';

const instances: Array<ViewerHandle<SvgViewerOptions>> = [];

afterEach(() => {
  instances.splice(0).forEach((instance) => instance.destroy());
  document.body.replaceChildren();
});

const setup = () => {
  const host = document.createElement('div');

  host.innerHTML =
    '<svg id="original"><title id="title">Platform diagram</title><text>Original</text></svg>';

  host.setAttribute('aria-label', 'Platform label');
  document.body.append(host);
  const svg = host.querySelector('svg')!;
  const instance = enhanceSvg(host, { svg, source: 'A' });

  instances.push(instance);

  return { host, svg, instance };
};

describe('SVG enhancement', () => {
  it('keeps platform SVG intact and restores trigger attributes on destroy', () => {
    const { host, svg, instance } = setup();
    const original = svg.outerHTML;

    host.click();
    expect(document.querySelector('dialog svg')?.id).not.toBe('original');
    expect(svg.outerHTML).toBe(original);
    instance.destroy();
    expect(host.querySelector('svg')).toBe(svg);
    expect(host.getAttribute('aria-label')).toBe('Platform label');
    expect(host.hasAttribute('tabindex')).toBe(false);
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('accepts replacement SVG/source together and rejects detached SVG', async () => {
    const { host, svg, instance } = setup();
    const ready = vi.fn();

    host.addEventListener('mermaid-viewer:ready', ready);
    await flushPromises();
    instance.open();
    const replacement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    replacement.textContent = 'Replacement';

    svg.replaceWith(replacement);
    instance.update({ svg: replacement, source: 'B' });
    expect(document.querySelector('dialog')).toBeNull();
    instance.open();
    expect(document.querySelector('dialog svg')?.textContent).toBe('Replacement');
    instance.close();
    replacement.remove();
    instance.open();
    expect(document.querySelector('dialog')).toBeNull();
    instance.destroy();
    await flushPromises();
    expect(ready).toHaveBeenCalledTimes(1);
  });
});
