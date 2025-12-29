/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  globalSetup: '<rootDir>/jest.globalSetup.cjs',
  globalTeardown: '<rootDir>/jest.globalTeardown.cjs',
  testTimeout: 20000,
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { useESM: true, tsconfig: { module: 'NodeNext', moduleResolution: 'NodeNext', esModuleInterop: true } }
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  verbose: false,
};
