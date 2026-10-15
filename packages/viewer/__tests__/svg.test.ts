import { describe, it, expect } from 'vitest';
import { cloneMermaidSvg, getSvgSource } from '../src/helpers/svg';

const createContainer = (innerHtml: string): HTMLElement => {
  const container = document.createElement('div');

  container.innerHTML = innerHtml;

  return container;
};

describe('getSvgSource', () => {
  it('returns an empty string when the container is null', () => {
    expect(getSvgSource(null)).toBe('');
  });

  it('returns an empty string when the container has no svg', () => {
    const container = createContainer('<div>no svg here</div>');

    expect(getSvgSource(container)).toBe('');
  });

  it('serializes void elements like <br> with self-closing tags', () => {
    const container = createContainer('<svg id="test"><text>line1<br>line2</text></svg>');

    const source = getSvgSource(container);

    expect(source).toContain('<br/>');
    expect(source).not.toContain('<br>');
  });
});

describe('SVG clone references', () => {
  it('remaps all local IDs, URLs, links, ARIA and CSS selectors without touching external references or colors', () => {
    const original = `<svg id="diagram" aria-labelledby="title description">
      <style>#diagram #node {fill:#fff; marker-end:url(#marker)} @media screen {#node {clip-path:url('#clip')}}</style>
      <title id="title">Title</title><desc id="description">Description</desc>
      <defs><marker id="marker"/><clipPath id="clip"/><filter id="filter"/><mask id="mask"/></defs>
      <g id="node" clip-path="url(#clip)" filter="url(#filter)" mask="url(#mask)" marker-end="url(#marker)"/>
      <a href="#node"/><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#node"/>
      <a href="https://example.com/#node"/><path fill="#fff"/>
    </svg>`;
    const container = new DOMParser().parseFromString(cloneMermaidSvg(original), 'image/svg+xml');
    const svg = container.querySelector('svg')!;
    const node = container.querySelector('g')!;
    const marker = container.querySelector('marker')!;

    expect(svg.id).not.toBe('diagram');
    expect(svg.getAttribute('aria-labelledby')).toBe(
      `${container.querySelector('title')!.id} ${container.querySelector('desc')!.id}`,
    );
    expect(node.getAttribute('marker-end')).toBe(`url(#${marker.id})`);
    expect(container.querySelector('a')?.getAttribute('href')).toBe(`#${node.id}`);
    expect(container.querySelector('use')?.getAttribute('xlink:href')).toBe(`#${node.id}`);
    expect(container.querySelector('style')?.textContent).toContain(`#${svg.id} #${node.id}`);
    expect(container.querySelector('style')?.textContent).toContain('fill:#fff');
    expect(container.querySelectorAll('a')[1].getAttribute('href')).toBe(
      'https://example.com/#node',
    );
    expect(cloneMermaidSvg(original)).not.toBe(svg.outerHTML);
  });
});
