import { defineConfig } from 'vite'
import vueSsr from 'vite-plugin-vue-ssr/plugin'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    vueSsr(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: [ 'es2022', 'edge89', 'firefox89', 'chrome89', 'safari15' ],
  }
})
