import { defaultViewerLabels, viewerCssProperties } from './customization';
import type { ViewerUIOptions } from './types';

export const getLabels = (options: ViewerUIOptions) => ({
  ...defaultViewerLabels,
  ...options.customization?.labels,
});

export const applyPresentation = (
  element: HTMLElement,
  options: ViewerUIOptions,
  inheritFrom?: HTMLElement,
) => {
  element.dataset.mvAppearance = options.appearance ?? 'light';

  const inherited = inheritFrom?.ownerDocument.defaultView?.getComputedStyle(inheritFrom);

  for (const property of viewerCssProperties) {
    const value = options.customization?.css?.[property] ?? inherited?.getPropertyValue(property);

    if (value?.trim()) {
      element.style.setProperty(property, value);
    } else {
      element.style.removeProperty(property);
    }
  }
};
