import type { Plugin } from 'vite';
import type { MermaidConfig } from 'mermaid';

export interface MermaidPluginOptions extends MermaidConfig {
  download?: boolean;
  copy?: boolean;
}

const DEFAULT_CONFIG: MermaidConfig = {
  securityLevel: 'loose',
  startOnLoad: false,
};

export const MermaidPlugin = (inlineConfig?: MermaidPluginOptions): Plugin => {
  const { download, copy, ...mermaidConfig } = inlineConfig ?? {};

  const config = {
    ...DEFAULT_CONFIG,
    ...mermaidConfig,
    download: download ?? true,
    copy: copy ?? true,
  };

  const virtualModuleId = 'virtual:mermaid-config';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'vitepress-mermaid-viewer',
    enforce: 'post',

    transform(code: string, id: string) {
      if (id.includes('vitepress/dist/client/app/index.js')) {
        code =
          `import 'vitepress-mermaid-viewer/style.css';\n` +
          `import Mermaid from 'vitepress-mermaid-viewer/Mermaid';\n` +
          code;

        const lines = code.split('\n');
        const componentLineIdx = lines.findIndex((line) => line.includes('app.component'));

        lines.splice(componentLineIdx, 0, '  app.component("Mermaid", Mermaid);');

        return {
          code: lines.join('\n'),
          map: null,
        };
      }
    },

    resolveId(id: string) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    load(id: string) {
      if (id === resolvedVirtualModuleId) {
        return `export default ${JSON.stringify(config)};`;
      }
    },
  };
};
