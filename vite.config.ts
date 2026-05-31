import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/hub': {
        target: 'https://localhost:7143', // Thay bằng URL Backend của bạn
        changeOrigin: true,
        secure: false,
        ws: true, // <-- QUAN TRỌNG: Phải bật ws (WebSocket) thành true
      }
    }
  }
})