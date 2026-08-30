module.exports = {
  rootDir: '../..',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/server/component'],
  testMatch: ['<rootDir>/test/server/component/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: '<rootDir>/test/tsconfig.server.json' },
    ],
  },
};
