import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import kassaila from 'eslint-plugin-kassaila';
import pluginVue from 'eslint-plugin-vue';

export default defineConfigWithVueTs(
  {
    ignores: ['dist/**', 'coverage/**', 'docs/**', '*.config.*'],
  },

  eslint.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommendedTypeChecked,
  kassaila.configs.recommended,
  skipFormatting,

  {
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript (type-aware)
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],

      // Vue
      'vue/multi-word-component-names': 'off',
      'vue/no-reserved-component-names': 'error',
      'vue/require-prop-types': 'error',
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/prop-name-casing': ['error', 'camelCase'],
      'vue/html-self-closing': [
        'error',
        { html: { void: 'always', normal: 'always', component: 'always' } },
      ],
      'vue/attributes-order': ['error', { alphabetical: false }],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/define-macros-order': [
        'error',
        { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] },
      ],
      'vue/no-unused-refs': 'error',
      'vue/no-useless-v-bind': 'error',
      'vue/padding-line-between-blocks': 'error',
      'vue/no-empty-component-block': 'error',

      // JavaScript
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-implicit-coercion': ['error', { boolean: true, allow: [] }],
      'curly': ['error', 'all'],
      'default-case': 'error',
      'default-case-last': 'error',
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'break' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'switch', 'try'] },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'switch', 'try'], next: '*' },
        {
          blankLine: 'always',
          prev: { selector: 'ExpressionStatement[expression.type=AssignmentExpression]' },
          next: { selector: 'ExpressionStatement[expression.type=CallExpression]' },
        },
        {
          blankLine: 'always',
          prev: { selector: 'ExpressionStatement[expression.type=CallExpression]' },
          next: { selector: 'ExpressionStatement[expression.type=AssignmentExpression]' },
        },
      ],
    },
  },

  // markdown-it has no public types — suppress unsafe-* rules for files that interact with it
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
);
