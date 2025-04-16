module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    // project: './tsconfig.json', // 可选：如果需要更严格的类型检查规则，可以取消注释此行
  },
  rules: {
    // 在这里添加或覆盖规则
    // 例如：允许使用 require
    '@typescript-eslint/no-var-requires': 'off',
    // 例如：允许使用 any 类型（如果旧代码中大量使用）
    '@typescript-eslint/no-explicit-any': 'off',
    // 例如：允许未使用的变量（如果旧代码中有）
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    // 根据需要调整其他规则
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'out/',
    'bin/' // 忽略 bin 目录下的 exe 文件
  ]
};