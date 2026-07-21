/**
 * @internal
 * SVG manipulation helpers for the bundled `<MermaidViewer>` component.
 * Not part of the public API — import path may change between minor versions.
 */

const DIAGRAM_LABEL = 'Mermaid diagram';

/**
 * Clone SVG HTML with updated ID suffix and accessibility attributes.
 */
export const cloneMermaidSvg = (svgHtml: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgHtml, 'text/html');
  const svgEl = doc.querySelector('svg');

  if (!svgEl) {
    return '';
  }

  const origId = svgEl.id;

  if (!svgEl.hasAttribute('role')) {
    svgEl.setAttribute('role', 'img');
  }

  if (!svgEl.hasAttribute('aria-label') && !svgEl.hasAttribute('aria-labelledby')) {
    svgEl.setAttribute('aria-label', DIAGRAM_LABEL);
  }

  if (!origId) {
    return svgEl.outerHTML;
  }

  const newId = origId + '-zoom';

  svgEl.id = newId;

  const style = svgEl.querySelector('style');

  if (style?.textContent) {
    style.textContent = style.textContent.replaceAll('#' + origId, '#' + newId);
  }

  return svgEl.outerHTML;
};

/**
 * Get SVG outerHTML from a container element.
 */
export const getSvgSource = (container: HTMLElement | null): string => {
  if (!container) {
    return '';
  }

  const svgEl = container.querySelector('svg');

  if (!svgEl) {
    return '';
  }

  /**
   * If mermaid content contains `\n`, it may be rendered as `<br>`.
   * However, plain SVG must be in XML format, so it must be rendered using self-closing tags like `<br />`.
   * Use `XMLSerializer` to obtain a string that is safe for SVG.
   */
  const serializer = new XMLSerializer();
  const cleanSvg = serializer.serializeToString(svgEl);

  return cleanSvg;
};
