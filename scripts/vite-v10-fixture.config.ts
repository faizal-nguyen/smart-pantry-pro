import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// Local visual QA only. The production Vite config never imports these fixtures.
const root = path.resolve(__dirname, '..');
export default defineConfig({
  root,
  envDir: path.join(root, 'scripts/fixtures/v10'),
  plugins: [react()],
  resolve: { alias: [
    { find: '@/integrations/supabase/client', replacement: path.join(root, 'scripts/fixtures/v10/supabase.ts') },
    { find: '@/lib/api', replacement: path.join(root, 'scripts/fixtures/v10/api.ts') },
    { find: '@', replacement: path.join(root, 'src') },
  ] },
  server: { host: '127.0.0.1', port: 5174, strictPort: true, hmr: false },
  define: { process: { env: { NODE_ENV: 'development' }, version: 'v16.0.0' }, global: 'globalThis' },
});
