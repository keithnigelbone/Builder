import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      'storybook-static/**',
      '.playwright-cli/**',
      '.claude/**',
      '.claude-flow/**',
      '.agents/**',
      'oneUI/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The dev proxies deliberately use `any` for "shape not fully known
      // from documentation" API responses — a documented, load-bearing choice.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // eslint-plugin-react-hooks' "recommended" set now bundles React
      // Compiler-oriented rules (e.g. this one) that flag the standard
      // "reset local view state when a prop changes" effect idiom as
      // suspect. BuildPreview.tsx uses that idiom deliberately (see its
      // adjacent, documented exhaustive-deps disable) to reset the preview
      // canvas only when `category` changes, not on every `plan` update.
      // The rule's own suggested fix (key-based remount / derived state)
      // would change component lifecycle/remount behavior, which is out of
      // bounds for a lint gate — so the rule is off rather than the file
      // rewritten.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
);
