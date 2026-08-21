import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";
import fs from "node:fs";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // SSL_KEY_FILE / SSL_CRT_FILE point to an existing key/cert pair; falls back to mkcert's auto-generated cert.
  const env = loadEnv(mode, process.cwd(), "");
  const keyPath = env.SSL_KEY_FILE;
  const certPath = env.SSL_CRT_FILE;
  const useCustomCert = Boolean(keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath));
  const https = useCustomCert
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined;

  return {
    plugins: [react(), ...(useCustomCert ? [] : [mkcert()])],
    server: {
      port: 443,
      host: "0.0.0.0",
      https,
    },
    preview: {
      port: 443,
      host: "0.0.0.0",
      https,
    },
  };
});
