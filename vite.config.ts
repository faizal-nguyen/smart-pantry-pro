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
            '@radix-ui/react-toast'
          ]
        }
      }
    },
    // Optimisations pour éviter les conflits
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    // Forcer la pré-bundling de React
    include: ['react', 'react-dom'],
    // Exclure les packages qui peuvent causer des conflits
    exclude: ['@radix-ui/react-select']
  }
}));
