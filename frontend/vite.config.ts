import { defineConfig } from "vite";

const runningInDocker = process.env.DOCKER_ENV === "true";
const defaultProxyTarget = runningInDocker
    ? "http://host.docker.internal:8000"
    : "http://localhost:8000";
const proxyTarget = process.env.VITE_PROXY_TARGET || defaultProxyTarget;

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
                target: "http://host.docker.internal:8000",
                changeOrigin: true,
            },
            "/uploads": {
                target: "http://host.docker.internal:8000",
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
