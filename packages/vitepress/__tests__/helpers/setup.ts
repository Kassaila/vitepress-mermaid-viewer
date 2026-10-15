import { vi } from 'vitest';

export const createMermaidMock = (overrides?: {
  render?: ReturnType<typeof vi.fn>;
  initialize?: ReturnType<typeof vi.fn>;
  registerExternalDiagrams?: ReturnType<typeof vi.fn> | null;
}) => ({
  default: {
    initialize: overrides?.initialize ?? vi.fn(),
    render: overrides?.render ?? vi.fn().mockResolvedValue({ svg: '<svg id="mock">mock</svg>' }),
    ...(overrides?.registerExternalDiagrams !== null && {
      registerExternalDiagrams:
        overrides?.registerExternalDiagrams ?? vi.fn().mockResolvedValue(undefined),
    }),
  },
});

export const createMarkdownItStub = () => {
  const defaultFence = vi.fn(
    (_tokens: unknown[], _idx: number, _options: unknown, _env: unknown, _self: unknown) =>
      '<default-fence/>',
  );

  return {
    md: {
      renderer: {
        rules: {
          fence: defaultFence,
        },
      },
    },
    defaultFence,
  };
};

export const flushPromises = async () => {
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
};
