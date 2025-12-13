module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
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
    // 允许使用 any 类型（在某些情况下必要）
    '@typescript-eslint/no-explicit-any': 'warn',
    // 允许未使用的变量（测试中可能有用）
    '@typescript-eslint/no-unused-vars': 'warn',
    // 要求使用分号
    'semi': ['error', 'always'],
    // 要求使用单引号
    'quotes': ['error', 'single'],
    // 禁止 console.log（但允许 console.error 和 console.warn）
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  },
  globals: {
    chrome: 'readonly'
  }
};