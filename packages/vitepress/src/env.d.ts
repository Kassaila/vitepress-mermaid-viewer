declare module 'virtual:mermaid-config' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- internal type reference inside an ambient module
  const config: import('./vite-plugin').MermaidPluginOptions;

  export default config;
}
