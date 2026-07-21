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
 * Get SVG from a container element.
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
   * Mermaid can render `\n` in node labels as an unclosed HTML `<br>` inside
   * a <foreignObject>, which `outerHTML` would serialize as-is — invalid XML.
   * `XMLSerializer.serializeToString` self-closes void elements, keeping the
   * exported SVG spec-compliant.
   */
  const serializer = new XMLSerializer();
  const cleanSvg = serializer.serializeToString(svgEl);

  return cleanSvg;
};
