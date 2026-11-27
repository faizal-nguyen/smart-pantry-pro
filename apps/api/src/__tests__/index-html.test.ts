import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * V11-06 E7: the browser never calls OpenAI (only the API does), so the page must not open a
 * connection to it either: a preconnect hands every visitor's address to that host.
 */
test('index.html opens no early connection to a third party other than the app backend', () => {
  const html = readFileSync(join(__dirname, '../../../../index.html'), 'utf8');
  const hosts = [...html.matchAll(/<link[^>]+rel="(?:preconnect|dns-prefetch)"[^>]+href="([^"]+)"/g)].map(match => new URL(match[1]).host);
  expect(hosts.filter(host => !host.endsWith('.supabase.co'))).toEqual([]);
});
