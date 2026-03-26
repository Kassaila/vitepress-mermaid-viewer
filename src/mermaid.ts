import mermaid from 'mermaid';
import type { ExternalDiagramDefinition, MermaidConfig } from 'mermaid';

export const init = async (externalDiagrams: ExternalDiagramDefinition[]): Promise<void> => {
  try {
    if (mermaid.registerExternalDiagrams) {
      await mermaid.registerExternalDiagrams(externalDiagrams);
    }
  } catch (e) {
    console.error(e);
  }
};

export const render = async (id: string, code: string, config: MermaidConfig): Promise<string> => {
  mermaid.initialize(config);
  const { svg } = await mermaid.render(id, code);

  return svg;
};
