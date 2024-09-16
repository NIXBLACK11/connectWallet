import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'global': {},
  },
  resolve: {
    alias: {
      'buffer': 'buffer/',
      'process': 'process/browser',
    },
  },
})