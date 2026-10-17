import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api calls sang Spring Boot trong dev để tránh CORS issue với cookie
      // (axios đã cấu hình CORS đầy đủ, proxy này là optional fallback)
    },
  },
})
