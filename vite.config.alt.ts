import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Alternative Vite config kept without spaces in filename
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react({
      jsxImportSource: "react",
      babel: {
        plugins: [["@babel/plugin-transform-react-jsx", { runtime: "automatic" }]]
      }
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        }
      }
    },
    commonjsOptions: { include: [/node_modules/], transformMixedEsModules: true },
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    reportCompressedSize: false
  },
  optimizeDeps: { include: ['react', 'react-dom', '@supabase/supabase-js'] },
  define: { 'process.env.NODE_ENV': JSON.stringify(mode) }
}));
