// Unit and in-process route tests do not need to boot the full API or contact providers.
const { globalSetup, globalTeardown, ...base } = require('./jest.config.cjs');
module.exports = { ...base, rootDir: __dirname };
