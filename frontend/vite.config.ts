import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        autoprefixer(),
      ],
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
