import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/mangadex": {
        target: "https://api.mangadex.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mangadex/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err) => {
            console.error("Proxy error:", err);
          });

          proxy.on("proxyReq", (proxyReq, req) => {
            const origin = req.headers.origin || `http://${req.headers.host}`;
            proxyReq.setHeader("Origin", origin);
            // Add MangaDex API authorization header
            proxyReq.setHeader("Authorization", "Bearer personal-client-46011b3e-6848-45a0-9b09-b62429c5d6bf-cc5ab956");
            console.log("→ Sending Request:", req.method, req.url, "Origin:", origin);
          });

          proxy.on("proxyRes", (proxyRes, req) => {
            const origin = req.headers.origin || `http://${req.headers.host}`;
            proxyRes.headers["Access-Control-Allow-Origin"] = origin;
            proxyRes.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
            proxyRes.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
            proxyRes.headers["Vary"] = "Origin";
            console.log("← Response:", proxyRes.statusCode, req.url, "Origin:", origin);
          });
        },
      },
    },
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
