import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

// Proxy keeps API calls same-origin so the browser never makes a
// cross-origin request to the backend (avoids CORS/mixed-content issues).
const apiProxy = {
  "/api": {
    target: process.env.BACKEND_URL || "http://localhost:3000",
    changeOrigin: true,
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    port: 443,
    host: "0.0.0.0",
    proxy: apiProxy,
  },
  preview: {
    port: 443,
    host: "0.0.0.0",
    proxy: apiProxy,
  },
});
