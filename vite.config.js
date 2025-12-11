import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Menambahkan base URL relatif untuk compatibility yang lebih baik
  base: './', 
  
  // Konfigurasi Rollup (Untuk memastikan ia menemukan index.html)
  build: {
    rollupOptions: {
      input: {
        // Karena index.html sekarang di root, kita referensikan langsung
        main: './index.html', 
      },
    },
  },
});