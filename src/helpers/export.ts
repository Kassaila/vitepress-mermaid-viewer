const REVOKE_DELAY_MS = 10_000;
const MAX_CANVAS_SIDE = 4096;
const PNG_SCALE = 2;
const UNITLESS_PX_RE = /^[\d.]+(?:px)?$/;

/**
 * Download SVG source as an .svg file.
 */
export const downloadFileSvg = (svgSource: string, id: string): void => {
  const blob = new Blob([svgSource], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `mermaid-${id}.svg`;

  a.click();

  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};

/**
 * Parse SVG dimensions from an SVG element.
 * Accepts only unitless or px values; falls back to viewBox.
 */
const parseSvgDimensions = (svgEl: SVGElement): { width: number; height: number } | null => {
  const rawW = svgEl.getAttribute('width') || '';
  const rawH = svgEl.getAttribute('height') || '';

  if (UNITLESS_PX_RE.test(rawW) && UNITLESS_PX_RE.test(rawH)) {
    const w = parseFloat(rawW);
    const h = parseFloat(rawH);

    if (w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }

  const vb = svgEl.getAttribute('viewBox');

  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);

    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  return null;
};

/**
 * Render SVG to canvas and download as a .png file.
 * Uses 2x scale for HiDPI sharpness, clamped to MAX_CANVAS_SIDE.
 * Calls onDone() when finished (success or failure).
 */
export const downloadFilePng = (svgSource: string, id: string, onDone: () => void): void => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgSource, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');

  if (!svgEl) {
    onDone();

    return;
  }

  const dims = parseSvgDimensions(svgEl);

  if (!dims) {
    onDone();

    return;
  }

  const scale = Math.min(PNG_SCALE, MAX_CANVAS_SIDE / Math.max(dims.width, dims.height));
  const canvasW = Math.round(dims.width * scale);
  const canvasH = Math.round(dims.height * scale);

  /**
   * Set explicit width/height and strip only max-width
   * so the Image loads at the correct intrinsic size.
   */
  svgEl.setAttribute('width', String(dims.width));
  svgEl.setAttribute('height', String(dims.height));
  svgEl.style.removeProperty('max-width');

  const serializer = new XMLSerializer();
  const cleanSvg = serializer.serializeToString(svgEl);
  const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanSvg);
  const img = new Image();

  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');

      canvas.width = canvasW;
      canvas.height = canvasH;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return;
      }

      ctx.fillStyle = '#ffffff';

      ctx.fillRect(0, 0, canvasW, canvasH);

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');

      a.href = dataUrl;
      a.download = `mermaid-${id}.png`;

      a.click();
    } finally {
      onDone();
    }
  };

  img.onerror = () => {
    onDone();
  };

  img.src = svgDataUri;
};
