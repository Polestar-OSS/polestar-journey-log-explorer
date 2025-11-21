import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: '/polestar-journey-log-explorer/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
});
