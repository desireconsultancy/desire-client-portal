import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    sourcemap: false, // Disable sourcemaps in production to protect original source code from inspection
  },

  server: {
    headers: {
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex, nocache',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    },
  },

  preview: {
    headers: {
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex, nocache',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    },
  },
})

