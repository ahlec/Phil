module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ['eslint:recommended', 'prettier/@typescript-eslint'],
  rules: {
    'no-console': 'error',
    'sort-keys': [
      'error',
      'asc',
      {
        natural: true,
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.js'],
      parserOptions: {
        ecmaVersion: 8,
        sourceType: 'module',
      },
    },
    {
      files: ['**/*.ts'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint',
      ],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
    },
  ],
};
