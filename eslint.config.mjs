import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
export default defineConfig([
  ...nextVitals,
  // Existing UI effects are audited separately; introduce lint without requiring
  // a React compiler migration or changing intentional prose in JSX.
  { rules: {
    'react/no-unescaped-entities': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/refs': 'off',
    'react-hooks/purity': 'off',
  } },
  globalIgnores(['.next/**','node_modules/**']),
]);
