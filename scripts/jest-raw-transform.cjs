/** Jest: a Vite `?raw` import of a Markdown file gives the file's text, as it does in the app. */
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');

const SELF = readFileSync(__filename, 'utf8');

module.exports = {
  process(source) {
    return { code: `module.exports = ${JSON.stringify(source)};` };
  },
  // The cached result changes with the file and with this transformer.
  getCacheKey(source, path) {
    return createHash('sha256').update(SELF).update('\0').update(path).update('\0').update(source).digest('hex');
  },
};
