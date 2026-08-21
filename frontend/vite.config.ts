import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    port: 443,
    host: "0.0.0.0",
  },
  preview: {
    port: 443,
    host: "0.0.0.0",
  },
});
