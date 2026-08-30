// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('@granite-js/react-native/jest').config({
  rootDir: __dirname,
  roots: ['<rootDir>/test/client'],
  testMatch: ['<rootDir>/test/client/**/*.test.ts'],
  moduleNameMapper: {
    '@babel/runtime(.*)': `${path.dirname(require.resolve('@babel/runtime/package.json'))}$1`,
  },
});

module.exports = config;
