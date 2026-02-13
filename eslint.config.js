module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-constant-condition': 'warn',
    'no-unreachable': 'warn',
    'no-duplicate-case': 'error',
    'no-empty': 'warn',
    'no-redeclare': 'error',
    'eqeqeq': ['warn', 'smart'],
  },
  ignorePatterns: ['node_modules/', 'client/', 'dist/', 'coverage/'],
};
