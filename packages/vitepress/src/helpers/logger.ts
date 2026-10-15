const PREFIX = '[vitepress-mermaid-viewer]';

export const logWarn = (message: string, ...args: unknown[]): void => {
  console.warn(`${PREFIX} ${message}`, ...args);
};

export const logError = (message: string, ...args: unknown[]): void => {
  console.error(`${PREFIX} ${message}`, ...args);
};
