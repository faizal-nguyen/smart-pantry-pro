import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 3002,
    historyApiFallback: true, // Pour React Router
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
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
    // Lovable tagger désactivé temporairement pour debug
    // mode === 'development' && process.env.VERCEL !== '1' && (() => {
    //   try {
    //     // Utiliser import dynamique au lieu de require
    //     return {
    //       name: 'lovable-tagger-wrapper',
    //       async configResolved() {
    //         try {
    //           const { componentTagger } = await import("lovable-tagger");
    //           return componentTagger();
    //         } catch {
    //           console.log('lovable-tagger not available, skipping');
    //           return null;
    //         }
    //       }
    //     };
    //   } catch {
    //     return null;
    //   }
    // })(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Forcer une seule version de React
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      // Polyfills pour Node.js modules utilisés par Cloudinary
      "url": "url-polyfill",
      "querystring": "querystring-es3"
    },
  },
  build: {
    // Optimisations pour Vercel
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    // Optimisations pour le build de production
    rollupOptions: {
      // Externaliser les modules Node.js problématiques pour le navigateur
      external: (id) => {
        if (mode === 'development') {
          return ['cloudinary', 'googleapis', 'google-auth-library', '@google-cloud/vision', 'crypto', 'gcp-metadata'].some(dep => id.includes(dep));
        }
        return ['googleapis', 'google-auth-library', '@google-cloud/vision', 'gcp-metadata'].some(dep => id.includes(dep));
      },
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
          ],
          // Séparer les librairies de visualisation lourdes (lazy loaded)
          'three-vendor': ['three'],
          // Séparer les charts (lazy loaded)
          'charts-vendor': ['recharts'],
          // Séparer framer-motion
          'animation-vendor': ['framer-motion']
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
    ],
    // Exclure les packages Node.js du pré-bundling pour éviter les erreurs
    exclude: ['cloudinary', 'googleapis', 'google-auth-library', '@google-cloud/vision', 'gcp-metadata']
  },
  // Configuration pour les polyfills Node.js et définitions globales
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.GOOGLE_SDK_NODE_LOGGING': 'undefined',
    'process.version': '"v16.0.0"',
    global: 'globalThis',
    process: {
      env: {
        NODE_ENV: mode,
        GOOGLE_SDK_NODE_LOGGING: undefined
      },
      version: 'v16.0.0',
      nextTick: 'setTimeout'
    }
  },
}));
