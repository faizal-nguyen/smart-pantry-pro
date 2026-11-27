import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * V11-06 E7: /confidentialite imports docs/PRIVACY-POLICY.md at build time, so the file must reach
 * Vercel. .vercelignore excludes documentation; gitignore rules cannot re-include a file whose folder
 * is excluded, hence `docs/*` (its content) rather than `docs/`, and the negation after every rule
 * that would match the file.
 */
test('.vercelignore keeps the privacy policy that the build imports', () => {
  const rules = readFileSync(join(__dirname, '../../../../.vercelignore'), 'utf8')
    .split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  expect(rules).not.toContain('docs/');
  expect(rules).not.toContain('/docs/');
  const keep = rules.lastIndexOf('!docs/PRIVACY-POLICY.md');
  expect(keep).toBeGreaterThan(-1);
  const excluding = ['docs/*', '/docs/*', '*.md', 'PRIVACY-POLICY.md', 'docs/PRIVACY-POLICY.md'];
  expect(rules.slice(keep + 1).filter(rule => excluding.includes(rule))).toEqual([]);
});
