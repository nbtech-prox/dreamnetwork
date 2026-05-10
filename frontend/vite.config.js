import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        // Garantir que cookies são passados corretamente
        cookieDomainRewrite: "localhost",
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            // Garantir que Set-Cookie não é bloqueado
            if (proxyRes.headers["set-cookie"]) {
              console.log("[Vite Proxy] Set-Cookie:", proxyRes.headers["set-cookie"]);
            }
          });
        },
      },
    },
  },
  build: {
    target: "esnext",
  },
  worker: {
    format: "es",
  },
});
