import type { UserConfig } from 'vitepress';
import type { MermaidConfig } from 'mermaid';

import { MermaidPlugin } from './vite-plugin';
import { MermaidMarkdown } from './markdown-plugin';
import type { MermaidPluginConfig } from './markdown-plugin';

declare module 'vitepress' {
  interface UserConfig {
    mermaid?: MermaidConfig;
    mermaidPlugin?: MermaidPluginConfig;
  }
}

export const withMermaid = <T>(config: UserConfig<T>): UserConfig<T> => {
  if (!config.markdown) {
    config.markdown = {};
  }

  const existingMarkdownConfig = config.markdown.config || (() => {});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- markdown-it instance
  config.markdown.config = (md: any) => {
    MermaidMarkdown(md, config.mermaidPlugin);
    existingMarkdownConfig(md);
  };

  if (!config.vite) {
    config.vite = {};
  }

  if (!config.vite.plugins) {
    config.vite.plugins = [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config.vite.plugins.push(MermaidPlugin(config.mermaid) as any);

  if (!config.vite.optimizeDeps) {
    config.vite.optimizeDeps = {};
  }

  if (!config.vite.optimizeDeps.include) {
    config.vite.optimizeDeps.include = [];
  }

  config.vite.optimizeDeps.include = [
    ...config.vite.optimizeDeps.include,
    '@braintree/sanitize-url',
    'dayjs',
    'debug',
    'cytoscape-cose-bilkent',
    'cytoscape',
  ];

  if (!config.vite.resolve) {
    config.vite.resolve = {};
  }

  const aliases: Record<string, string> = {
    'dayjs/plugin/advancedFormat.js': 'dayjs/esm/plugin/advancedFormat',
    'dayjs/plugin/customParseFormat.js': 'dayjs/esm/plugin/customParseFormat',
    'dayjs/plugin/isoWeek.js': 'dayjs/esm/plugin/isoWeek',
    'cytoscape/dist/cytoscape.umd.js': 'cytoscape/dist/cytoscape.esm.js',
  };

  if (config.vite.resolve.alias) {
    if (Array.isArray(config.vite.resolve.alias)) {
      config.vite.resolve.alias = [
        ...config.vite.resolve.alias,
        ...Object.entries(aliases).map(([find, replacement]) => ({ find, replacement })),
      ];
    } else {
      config.vite.resolve.alias = {
        ...config.vite.resolve.alias,
        ...aliases,
      };
    }
  } else {
    config.vite.resolve.alias = aliases;
  }

  return config;
};
