import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: "0.0.0.0", // Allow external connections
        port: 5173,
        strictPort: true, // Fail if port is already in use
        watch: {
            usePolling: true, // Required for Docker file watching
            interval: 1000, // Poll every second
        },
        hmr: {
            clientPort: 5173, // Port the browser connects to (mapped port from docker-compose)
        },
    },
    // Production build settings
    build: {
        outDir: "dist",
        sourcemap: false,
        minify: "esbuild",
    },
    // Environment variables - Vite requires VITE_ prefix
    envPrefix: "VITE_",
    // Preview server configuration for testing production builds
    preview: {
        port: 5173,
        strictPort: true,
    },
});
