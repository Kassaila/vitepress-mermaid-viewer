import { describe, it, expect } from 'vitest';
import { getSvgSource } from '../src/helpers/svg';

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
