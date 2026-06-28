import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { vueConfig } from 'eslint-plugin-kassaila/configs/vue';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'docs/**', '*.config.*'],
  },

  ...vueConfig,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
  },

  /**
   * Ops scripts: standalone Node utilities outside the src tsconfig — lint without
   * type-aware rules (no project service)
   */
  {
    files: ['scripts/**'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['scripts/**'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      /**
       * CLI utilities legitimately write progress to stdout
       */
      'no-console': 'off',
    },
  },

  {
    files: ['__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  /**
   * markdown-it has no public types
   */
  {
    files: ['src/markdown-plugin.ts', 'src/with-mermaid.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
];
