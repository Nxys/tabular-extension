module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended'
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
    webextensions: true
  },
  rules: {
    // 基本规则
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'off', // 使用 TypeScript 版本
    // TypeScript 规则
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_'
    }]
  },
  globals: {
    chrome: 'readonly'
  }
};