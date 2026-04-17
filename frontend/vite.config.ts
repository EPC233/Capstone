import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
        allowedHosts: true,
        watch: {
            usePolling: true,
            interval: 1000,
        },
        hmr: {
            clientPort: 5173,
        },
        proxy: {
            "/api": {
                target: "http://backend:8000",
                changeOrigin: true,
            },
            "/uploads": {
                target: "http://backend:8000",
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: "dist",
        sourcemap: false,
        minify: "esbuild",
    },
    envPrefix: "VITE_",
    preview: {
        port: 5173,
        strictPort: true,
    },
});
