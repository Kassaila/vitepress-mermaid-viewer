let nextCloneId = 0;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Clone Mermaid SVG and rewrite references inside the clone, never the source document.
 */
export const cloneMermaidSvg = (svgHtml: string, label = 'Mermaid diagram'): string => {
  const parser = new DOMParser();
  let doc = parser.parseFromString(svgHtml, 'image/svg+xml');

  /**
   * Mermaid HTML labels can contain HTML void tags. Fall back to HTML parsing for that output.
   */
  if (doc.querySelector('parsererror')) doc = parser.parseFromString(svgHtml, 'text/html');

  const svg = doc.querySelector('svg');

  if (!svg) return '';

  const elements = [svg, ...svg.querySelectorAll('*')];
  const ids = new Map<string, string>();
  let prefix: string;

  do {
    prefix = `mv-copy-${++nextCloneId}-`;
  } while (elements.some((_element, index) => document.getElementById(prefix + index)));

  for (const [index, element] of elements.entries()) {
    if (element.id) ids.set(element.id, prefix + index);
  }

  const rewriteUrls = (value: string) =>
    value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (original, quote: string, id: string) =>
      ids.has(id) ? `url(${quote}#${ids.get(id)}${quote})` : original,
    );

  for (const element of elements) {
    const replacementId = ids.get(element.id);

    if (replacementId) element.id = replacementId;

    for (const attribute of Array.from(element.attributes)) {
      let value = rewriteUrls(attribute.value);

      if (attribute.localName === 'href' && value.startsWith('#')) {
        value = ids.has(value.slice(1)) ? `#${ids.get(value.slice(1))}` : value;
      } else if (
        [
          'aria-labelledby',
          'aria-describedby',
          'aria-controls',
          'aria-owns',
          'aria-activedescendant',
        ].includes(attribute.name)
      ) {
        value = value
          .split(/\s+/)
          .map((id) => ids.get(id) ?? id)
          .join(' ');
      }

      if (value !== attribute.value)
        element.setAttributeNS(attribute.namespaceURI, attribute.name, value);
    }

    if (element.localName === 'style' && element.textContent) {
      let css = rewriteUrls(element.textContent);

      /**
       * Rewrite selector preludes only; a color such as #fff in a declaration is not an IDREF.
       */
      css = css.replace(/([^{}]+)\{/g, (_match, selector: string) => {
        let next = selector;

        for (const [id, replacement] of ids) {
          const escaped = globalThis.CSS?.escape?.(id) ?? id;

          next = next.replace(
            new RegExp(`#${escapeRegExp(escaped)}(?![\\w-])`, 'g'),
            `#${replacement}`,
          );
        }

        return next + '{';
      });
      element.textContent = css;
    }
  }

  if (!svg.hasAttribute('role')) svg.setAttribute('role', 'img');

  if (!svg.hasAttribute('aria-label') && !svg.hasAttribute('aria-labelledby'))
    svg.setAttribute('aria-label', label);

  return svg.outerHTML;
};

/**
 * XML serialization keeps HTML-label void tags valid in exported SVG.
 */
export const getSvgSource = (container: HTMLElement | null): string => {
  const svg = container?.querySelector('svg');

  return svg ? new XMLSerializer().serializeToString(svg) : '';
};
