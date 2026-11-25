import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler rules shipped with eslint-plugin-react-hooks v6.
      // The codebase predates them; keep them visible as warnings while the
      // affected screens are migrated incrementally (see CONSTITUTION.md).
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
      // `any` is tracked debt, not a merge blocker.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    '.agents/**',
    '.opencode/**',
    'next-env.d.ts',
  ]),
]);
