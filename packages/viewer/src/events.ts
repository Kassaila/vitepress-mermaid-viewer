import type { ViewerEventMap } from './types';

export const emitViewerEvent = <Name extends keyof ViewerEventMap>(
  host: HTMLElement,
  name: Name,
  detail: ViewerEventMap[Name]['detail'],
) => {
  const EventClass = host.ownerDocument.defaultView?.CustomEvent ?? CustomEvent;

  host.dispatchEvent(new EventClass(name, { detail, bubbles: true, composed: true }));
};
