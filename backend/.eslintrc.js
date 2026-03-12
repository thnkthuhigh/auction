// Backend ESLint config
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
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true },
    ],

    // ── Security rules ────────────────────────────────────────────────────
    // Prevent AI from writing raw SQL strings (use Prisma typed queries instead)
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.property.name="$queryRawUnsafe"]',
        message:
          'Use prisma.$queryRaw with tagged template literals instead of $queryRawUnsafe to prevent SQL injection.',
      },
      {
        selector: 'CallExpression[callee.property.name="$executeRawUnsafe"]',
        message:
          'Use prisma.$executeRaw with tagged template literals instead of $executeRawUnsafe.',
      },
    ],
    'no-console': 'off', // backend uses logger, console allowed in dev
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-throw-literal': 'error',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'prisma/'],
};
