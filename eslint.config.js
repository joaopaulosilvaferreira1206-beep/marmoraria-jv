import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import noOnlyTests from 'eslint-plugin-no-only-tests'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android', 'electron']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { 'no-only-tests': noOnlyTests },
    languageOptions: {
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Erros que devem quebrar o build
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',

      // Qualidade de código
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-else-return': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'object-shorthand': 'error',

      // React
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Testes — nunca commitar .only
      'no-only-tests/no-only-tests': 'error',
    },
  },
])
