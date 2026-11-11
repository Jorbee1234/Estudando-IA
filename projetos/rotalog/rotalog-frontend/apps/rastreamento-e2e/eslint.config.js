const playwright = require('eslint-plugin-playwright');
const baseConfig = require('../../eslint.config.js');

module.exports = [playwright.configs['flat/recommended'], ...baseConfig];
