import { afterEach, describe, expect, it, vi } from 'vitest';
import { createViewport } from '../src/viewport';

const cleanups: Array<() => void> = [];
const setup = () => {
  const dialog = document.createElement('dialog');
  const content = document.createElement('figure');
  const output = document.createElement('output');

  dialog.append(content, output);
  document.body.append(dialog);
  const viewport = createViewport(dialog, content, output);

  cleanups.push(() => viewport.destroy());

  return { dialog, content, output, viewport };
};
const pointer = (target: EventTarget, type: string, id: number, x: number, y = 0) => {
  target.dispatchEvent(
    new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, button: 0, bubbles: true }),
  );
};

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('DOM viewport', () => {
  it('zooms around the wheel cursor', () => {
    const { dialog, content, output } = setup();

    vi.spyOn(content, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    } as DOMRect);
    const event = new WheelEvent('wheel', { deltaY: -1, cancelable: true });

    /**
     * happy-dom's WheelEvent does not implement the inherited MouseEvent coordinates.
     */
    Object.defineProperties(event, { clientX: { value: 100 }, clientY: { value: 50 } });
    dialog.dispatchEvent(event);
    expect(output.textContent).toBe('115%');
    expect(content.style.transform).toMatch(/translate\(-7\.499.*px, 0px\) scale\(1.15\)/);
  });

  it('clamps pinch, resumes a single-pointer drag and cleans up mid-drag', () => {
    const { content, output, viewport } = setup();

    pointer(content, 'pointerdown', 1, 0);
    pointer(content, 'pointerdown', 2, 10);
    pointer(document, 'pointermove', 2, 1000);
    expect(output.textContent).toBe('500%');
    pointer(document, 'pointerup', 2, 1000);
    pointer(document, 'pointermove', 1, 20, 10);
    expect(content.style.transform).toBe('translate(20px, 10px) scale(5)');
    const before = content.style.transform;

    viewport.destroy();
    pointer(document, 'pointermove', 1, 200, 200);
    expect(content.style.transform).toBe(before);
  });

  it('ignores unrelated pointers and keyboard input in editable elements', () => {
    const { dialog, content, output } = setup();
    const input = document.createElement('input');

    dialog.append(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
    expect(output.textContent).toBe('100%');
    pointer(content, 'pointerdown', 1, 0);
    pointer(document, 'pointermove', 99, 100);
    expect(content.style.transform).toBe('translate(0px, 0px) scale(1)');
    pointer(document, 'pointercancel', 1, 0);
    expect(content.classList.contains('mermaid-view-content--dragging')).toBe(false);
  });
});
