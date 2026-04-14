import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// When running behind ngrok, set NGROK_HOST env var to your tunnel domain
// e.g.  NGROK_HOST=cesar-biaxial-unfearfully.ngrok-free.dev npm run dev
const ngrokHost = process.env.NGROK_HOST

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'ehs.test',
      '.ngrok-free.dev',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    hmr: ngrokHost
      ? { protocol: 'wss', host: ngrokHost, clientPort: 443, overlay: false }
      : { overlay: false },
  },
})
