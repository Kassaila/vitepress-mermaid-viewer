import type { ExternalDiagramDefinition, MermaidConfig } from 'mermaid';
import { logError } from './helpers/logger';

const loadMermaid = async () => {
  const { default: mermaid } = await import('mermaid');

  return mermaid;
};

export const init = async (externalDiagrams: ExternalDiagramDefinition[]): Promise<void> => {
  try {
    const mermaid = await loadMermaid();

    if (mermaid.registerExternalDiagrams) {
      await mermaid.registerExternalDiagrams(externalDiagrams);
    }
  } catch (e) {
    logError('Failed to initialize external diagrams:', e);
  }
};

let lastConfigJson = '';

export const render = async (id: string, code: string, config: MermaidConfig): Promise<string> => {
  const mermaid = await loadMermaid();

  const configJson = JSON.stringify(config);

  if (configJson !== lastConfigJson) {
    mermaid.initialize(config);

    lastConfigJson = configJson;
  }

  const { svg } = await mermaid.render(id, code);

  return svg;
};
