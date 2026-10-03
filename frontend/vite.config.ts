import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // SIH26074 backend API routes
      "/states": { target: "http://localhost:8000", changeOrigin: true },
      "/districts": { target: "http://localhost:8000", changeOrigin: true },
      "/blocks": { target: "http://localhost:8000", changeOrigin: true },
      "/panchayats": { target: "http://localhost:8000", changeOrigin: true },
      "/map": { target: "http://localhost:8000", changeOrigin: true },
      "/search": { target: "http://localhost:8000", changeOrigin: true },
      "/health": { target: "http://localhost:8000", changeOrigin: true },
      "/config": { target: "http://localhost:8000", changeOrigin: true },
      "/advisory": { target: "http://localhost:8000", changeOrigin: true },
      "/verification": { target: "http://localhost:8000", changeOrigin: true },
      "/replay": { target: "http://localhost:8000", changeOrigin: true },
      "/data": { target: "http://localhost:8000", changeOrigin: true },
      "/analytics": { target: "http://localhost:8000", changeOrigin: true },
      "/reporter": { target: "http://localhost:8000", changeOrigin: true },
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
