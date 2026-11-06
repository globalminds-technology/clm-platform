/** @type {import('eslint').Linter.Config} */
const base = require('./base');

module.exports = {
  ...base,
  env: {
    node: true,
    jest: true,
    es2022: true,
  },
  rules: {
    ...base.rules,
    // Architectural Boundary Enforcement:
    // Backend must NEVER import from frontend apps or React packages
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['react', 'react-dom', '@clm/ui', '**/apps/*-portal/**'],
            message:
              'Boundary violation: apps/backend must never import from frontend code, React, or @clm/ui.',
          },
        ],
      },
    ],
  },
};
