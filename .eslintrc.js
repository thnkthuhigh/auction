// Root ESLint config – shared base rules
// Backend & Frontend extend this with their own stricter rules

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    // ── TypeScript strictness ─────────────────────────────────────────────
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // CRITICAL: AI loves generating `any`. Keep as error to force proper types.
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    // Force `import type` for type-only imports (tree-shaking + clarity)
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    // Prevent AI from casting its way out of type errors
    '@typescript-eslint/no-unsafe-argument': 'off', // use only in stricter configs
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': true, // never allow @ts-ignore
        'ts-nocheck': true, // never allow @ts-nocheck
      },
    ],

    // ── Code quality ─────────────────────────────────────────────────────
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always'], // no == comparisons
    'no-eval': 'error', // security: never eval
    'no-implied-eval': 'error', // security: no setTimeout(string)
    'no-new-func': 'error', // security: no new Function(string)
    'no-param-reassign': ['warn', { props: false }],
    'no-throw-literal': 'error', // always throw Error objects
    'no-duplicate-imports': 'error',
    'object-shorthand': 'warn',
    'no-useless-rename': 'error',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '*.js.map'],
};
