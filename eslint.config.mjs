// eslint.config.mjs
// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist', 'node_modules'],
  },

  // Base JS rules
  eslint.configs.recommended,

  // TypeScript (non-strict)
  ...tseslint.configs.recommended,

  // Prettier compatibility
  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.json'],
      },
    },
  },

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Turn off noisy unsafe rules
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Prettier formatting
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
