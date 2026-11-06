/** @type {import('eslint').Linter.Config} */
const base = require('./base');

module.exports = {
  ...base,
  env: {
    browser: true,
    es2022: true,
  },
  plugins: [...base.plugins, 'react', 'react-hooks'],
  extends: [
    ...base.extends,
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    ...base.rules,
    // Security Rule: Untrusted certificate data must not be injected as raw HTML
    'react/no-danger': 'error',
    // Architectural Boundary Enforcement:
    // Frontends must NEVER import directly from apps/backend
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/backend/**', '**/backend/src/**'],
            message:
              'Boundary violation: Frontend apps must never import from apps/backend. Connect via @clm/api-client.',
          },
        ],
      },
    ],
  },
};
