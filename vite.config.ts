import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/anilist": {
        target: "https://graphql.anilist.co",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anilist/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err) => {
            console.error("AniList Proxy error:", err);
          });

          proxy.on("proxyReq", (proxyReq, req) => {
            const origin = req.headers.origin || `http://${req.headers.host}`;
            proxyReq.setHeader("Origin", origin);
            proxyReq.setHeader("Accept", "application/json");
            proxyReq.setHeader("Content-Type", "application/json");
            console.log("→ AniList Request:", req.method, req.url);
          });

          proxy.on("proxyRes", (proxyRes, req) => {
            const origin = req.headers.origin || `http://${req.headers.host}`;
            proxyRes.headers["Access-Control-Allow-Origin"] = origin;
            proxyRes.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
            proxyRes.headers["Access-Control-Allow-Headers"] = "Content-Type";
            proxyRes.headers["Vary"] = "Origin";
            console.log("← AniList Response:", proxyRes.statusCode);
          });
        },
      },
      "/api/mangadex": {
        target: "https://api.mangadex.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mangadex/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err) => {
            console.error("MangaDex Proxy error:", err);
          });

          proxy.on("proxyReq", (proxyReq, req) => {
            const origin = req.headers.origin || `http://${req.headers.host}`;
            proxyReq.setHeader("Origin", origin);
            proxyReq.setHeader("Accept", "application/json");
            proxyReq.setHeader("Content-Type", "application/json");
            proxyReq.removeHeader("Authorization");
            console.log("→ MangaDex Request:", req.method, req.url);
          });

          proxy.on("proxyRes", (proxyRes, req) => {
            const origin = req.headers.origin || `http://${req.headers.host}`;
            proxyRes.headers["Access-Control-Allow-Origin"] = origin;
            proxyRes.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
            proxyRes.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
            proxyRes.headers["Vary"] = "Origin";
            console.log("← MangaDex Response:", proxyRes.statusCode);
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
