// vite.config.js (Diletakkan di root project)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // SOLUSI PENTING DI SINI:
  // Mengatur direktori root untuk proses build. 
  // Jika 'index.html' Anda berada di root repositori, gunakan:
  // root: '.', 
  
  // Namun, jika Anda menggunakan folder 'public/' (standar), 
  // kita perlu memastikan build directory-nya dikonfigurasi:
  build: {
    // Menghilangkan masalah path absolut atau relatif
    // Rollup akan memulai pencarian dari root project
    rollupOptions: {
      input: {
        main: './index.html' // Mengarahkan Rollup ke file HTML root
      }
    }
  }
  
  // Jika 'index.html' Anda berada di root project dan src/main.jsx ada di src/:
  // Anda TIDAK perlu menambahkan 'root' atau 'base' jika semuanya standar
  
});