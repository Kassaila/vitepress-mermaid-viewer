import type { ExternalDiagramDefinition, MermaidConfig, RenderResult } from 'mermaid';

let queue: Promise<void> = Promise.resolve();
let nextRenderId = 0;

const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = queue.then(operation);

  queue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
};

const loadMermaid = async () => {
  const { default: mermaid } = await import('mermaid');

  /**
   * Disable Mermaid's window.load handler before awaiting any registration/render work.
   */
  mermaid.startOnLoad = false;

  return mermaid;
};

/**
 * Browser setup API. Call before mounting components that use external diagram definitions.
 */
export const registerExternalDiagrams = (diagrams: ExternalDiagramDefinition[]): Promise<void> =>
  enqueue(async () => {
    const mermaid = await loadMermaid();

    mermaid.initialize({ startOnLoad: false });
    await mermaid.registerExternalDiagrams?.(diagrams);
  });

/**
 * @internal Serialized because Mermaid configuration is shared by all instances.
 */
export const render = (source: string, config: Readonly<MermaidConfig>): Promise<RenderResult> =>
  enqueue(async () => {
    const mermaid = await loadMermaid();
    const container = document.createElement('div');

    container.dataset.mermaidViewerStaging = '';
    container.style.cssText =
      'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;width:100%;';

    document.body.appendChild(container);

    try {
      mermaid.initialize({
        securityLevel: 'strict',
        ...config,
        startOnLoad: false,
        suppressErrorRendering: true,
      });

      let id: string;

      do {
        id = `mv-${++nextRenderId}`;
      } while (document.getElementById(id));

      return await mermaid.render(id, source, container);
    } finally {
      container.remove();
    }
  });
