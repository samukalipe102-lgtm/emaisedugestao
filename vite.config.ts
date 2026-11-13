import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Vite builds only the renderer (React UI). Electron main/preload are bundled
// separately with esbuild (see scripts/build-electron.mjs).
export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/renderer"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, "dist-renderer"),
    emptyOutDir: true,
  },
});
