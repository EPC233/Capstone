import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
        watch: {
            usePolling: true,
            interval: 1000,
        },
        hmr: {
            clientPort: 5173,
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
