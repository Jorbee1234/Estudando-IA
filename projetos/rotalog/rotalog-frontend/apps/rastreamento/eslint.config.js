const baseConfig = require('../../eslint.config.js');
const reactHooks = require('eslint-plugin-react-hooks');
const jsxA11y = require('eslint-plugin-jsx-a11y');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'no-console': 'error',
      // Segurança (ADR 0002, D5a): nada de HTML montado como string.
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use textContent ou nós DOM (ADR 0002, D5a).' },
        { property: 'outerHTML', message: 'Use textContent ou nós DOM (ADR 0002, D5a).' },
        { property: 'insertAdjacentHTML', message: 'Use nós DOM (ADR 0002, D5a).' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML é proibido (ADR 0002, D5a).',
        },
        {
          selector: "Literal[value=/unpkg\.com/]",
          message: 'Leaflet vem do pacote npm, não de CDN (ADR 0002, D5a).',
        },
        {
          selector: "CallExpression[callee.property.name='bindPopup'] > BinaryExpression",
          message: 'bindPopup não recebe string concatenada (ADR 0002, D5a).',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/test/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-restricted-syntax': 'off' },
  },
];
