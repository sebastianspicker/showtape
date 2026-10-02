import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['native/**', '.next/**', 'dist/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...nextVitals,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        requestAnimationFrame: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
