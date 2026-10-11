import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// في الـ dev: الـ API على 4000 والـ Vite على 5173 (proxy)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
      "/sitemap.xml": "http://localhost:4000",
      "/robots.txt": "http://localhost:4000",
    },
  },
});
