module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'jest.config.js', 'dist'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': ['error', {
      checksVoidReturn: {
        arguments: false,   // Allow async Express route handlers
        variables: false,   // Allow async handler variable assignments
        attributes: false,  // Allow async in JSX attributes
      },
    }],
    'no-console': 'error',
    'import/order': [
      'off',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        pathGroups: [
          { pattern: '@modules/**', group: 'internal', position: 'before' },
          { pattern: '@shared/**', group: 'internal', position: 'before' },
          { pattern: '@config/**', group: 'internal', position: 'before' },
          { pattern: '@/**', group: 'internal', position: 'before' },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'never',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
  overrides: [
    // Test files can use console.*
    {
      files: ['tests/**/*.ts', 'src/**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
      },
    },
    // Seed and script files can use console.*
    {
      files: [
        'src/db/prisma/seed.ts',
        'src/db/prisma/seed-patches.ts',
        'src/db/prisma/seeds/**/*.ts',
        'src/db/prisma/scripts/**/*.ts',
        'src/scripts/**/*.ts',
      ],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
      },
    },
    // Config files that run before logger is available
    {
      files: ['src/config/env.ts'],
      rules: {
        'no-console': ['error', { allow: ['error'] }],
      },
    },
    // Type declaration files — exports may be consumed externally
    {
      files: ['src/shared/types/**/*.ts', 'src/**/*.types.ts', 'src/**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    // Express type augmentation files need namespaces
    {
      files: ['src/types.ts', 'src/middleware/request-logger.ts'],
      rules: {
        '@typescript-eslint/no-namespace': 'off',
      },
    },
    // Service files require explicit return types
    {
      files: ['src/modules/**/*.service.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': ['off', {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        }],
      },
    },
  ],
};
