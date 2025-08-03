import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
      // Optimisations pour éviter les conflits React
      jsxImportSource: "react",
      babel: {
        plugins: [
          ["@babel/plugin-transform-react-jsx", { runtime: "automatic" }]
        ]
      }
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Forcer une seule version de React
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  build: {
    // Optimisations pour Vercel
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    // Optimisations pour le build de production
    rollupOptions: {
      output: {
        manualChunks: {
          // Séparer React dans son propre chunk
          'react-vendor': ['react', 'react-dom'],
          // Séparer les composants UI
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip'
          ],
          // Séparer les utilitaires
          'utils-vendor': [
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
            'tailwindcss-animate',
            'lucide-react',
            'date-fns',
            'zod',
            'react-hook-form',
            '@hookform/resolvers'
          ],
          // Séparer Supabase
          'supabase-vendor': [
            '@supabase/supabase-js',
            '@tanstack/react-query'
          ]
        }
      }
    },
    // Optimisations pour éviter les conflits
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    // Optimisations de performance
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    reportCompressedSize: false
  },
  optimizeDeps: {
    // Forcer la pré-bundling de React et des packages critiques
    include: [
      'react', 
      'react-dom',
      '@radix-ui/react-dialog',
      '@supabase/supabase-js'
    ]
  },
  // Optimisations pour Vercel
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode)
  }
}));
