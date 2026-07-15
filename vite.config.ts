import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Có thể tắt HMR bằng DISABLE_HMR trong môi trường CI hoặc container.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Tắt theo dõi tệp khi không dùng HMR để giảm tài nguyên.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': 'http://127.0.0.1:8080',
      },
    },
  };
});
