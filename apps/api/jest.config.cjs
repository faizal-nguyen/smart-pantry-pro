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
  // PRP-220.11: rewrite `@smart/shared` to its TS source so ts-jest can
  // compile it on the fly. Otherwise the dist/ ESM `export *` lands in
  // jest's CommonJS sandbox and trips on the `export` keyword.
  // The relative `.js -> ts` rewrite handles NodeNext-style imports
  // inside our own `src/`.
  moduleNameMapper: {
    '^@smart/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^(\\.{1,2}/.+)\\.js$': '$1',
  },
  verbose: false,
};
