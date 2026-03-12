// Frontend ESLint config
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true },
    ],

    // ── React specific ────────────────────────────────────────────────────
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // Prevent direct API calls inside render — use hooks/query
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: ['axios', 'axios/*'],
            importNames: ['default'],
            message: 'Import from @/services/api.service instead of using axios directly.',
          },
        ],
      },
    ],

    // ── Security ─────────────────────────────────────────────────────────
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    // Prevent dangerouslySetInnerHTML without sanitization
    'no-restricted-properties': [
      'error',
      {
        object: 'React',
        property: 'dangerouslySetInnerHTML',
        message: 'dangerouslySetInnerHTML is an XSS risk. Sanitize with DOMPurify first.',
      },
    ],

    // ── Code quality ─────────────────────────────────────────────────────
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    'no-throw-literal': 'error',
  },
  ignorePatterns: ['node_modules/', 'dist/'],
};
