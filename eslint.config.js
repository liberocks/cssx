import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.astro/**',
      '**/.next/**',
      '**/build/**',
      '**/.cache/**',
      '**/public/**',
      'experiments/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['packages/**/*.{js,cjs,mjs,ts,tsx}'],
    rules: {
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      curly: ['error', 'all'],
    },
  },
  {
    files: ['packages/**/*.ts', 'vitest.config.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['packages/compiler/src/**/*.ts', 'packages/babel-plugin/src/**/*.ts', 'packages/unplugin/src/**/*.ts'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/no-types': 'error',
      'jsdoc/require-hyphen-before-param-description': ['error', 'never'],
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: [
            'FunctionDeclaration',
            'Program > VariableDeclaration',
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSInterfaceDeclaration > TSPropertySignature',
            'TSInterfaceDeclaration > TSMethodSignature',
          ],
        },
      ],
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns-description': 'error',
    },
  },
  {
    files: ['packages/cssx/src/index.ts'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/no-types': 'error',
      'jsdoc/require-hyphen-before-param-description': ['error', 'never'],
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: [
            'FunctionDeclaration',
            'Program > VariableDeclaration',
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSInterfaceDeclaration > TSPropertySignature',
            'TSInterfaceDeclaration > TSMethodSignature',
          ],
        },
      ],
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns-description': 'error',
    },
  },
  {
    files: ['packages/intellisense/src/**/*.js'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/require-hyphen-before-param-description': ['error', 'always'],
      'jsdoc/require-jsdoc': ['error', { contexts: ['FunctionDeclaration', 'Program > VariableDeclaration'] }],
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns-description': 'error',
      'jsdoc/require-returns-type': 'error',
    },
  },
);
