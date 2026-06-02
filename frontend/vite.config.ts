import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      uncontrollable: path.resolve(__dirname, './src/vendor/uncontrollableCompat.ts'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/date-fns')) return 'calendar'
          if (id.includes('/react-dom') || id.includes('/scheduler')) return 'react-dom'
          if (id.includes('/react-router')) return 'react-router'
          if (id.includes('/react/')) return 'react'
          if (id.includes('/axios') || id.includes('/@tanstack/react-query')) return 'data'
          return undefined
        },
      },
    },
  },
})
