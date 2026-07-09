import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // ЭТА СТРОКА - САМАЯ ГЛАВНАЯ.
  base: './',
  plugins: [react()],
})