import type { IncomingMessage } from "node:http";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The local API behind /api. Served with --host for the booth, the proxy forwards a phone's two survey routes (posting an
// answer, reading a form by its token) and refuses every other route to any machine but this one, so the model route, the
// file routes and the collector's responses stay off the booth's network; the API checks the same on its side.
const local = (address: string | undefined) => /^(127\.|::1$|::ffff:127\.)/.test(address ?? "");
const phoneRoute = (req: IncomingMessage) =>
  (req.method === "POST" && /^\/api\/survey\/[A-Za-z0-9_-]{22}(\?|$)/.test(req.url ?? "")) || (req.method === "GET" && /^\/api\/survey\/[A-Za-z0-9_-]{22}\/form(\?|$)/.test(req.url ?? ""));
// Where the API listens: API_PORT in web/.env (or the shell), matching PORT in api/.env. 8787 by default.
const here = fileURLToPath(new URL(".", import.meta.url));
const API_PORT = loadEnv("", here, "").API_PORT || 8787;
const api = {
  "/api": {
    target: "http://localhost:" + API_PORT,
    changeOrigin: true,
    bypass: (req: IncomingMessage) => (local(req.socket.remoteAddress) || phoneRoute(req) ? undefined : false),
  },
};

export default defineConfig({
  plugins: [react()],
  // Built into the repo root's dist/, where the smokes, the film capture and the booth look for it.
  build: { outDir: "../dist", emptyOutDir: true },
  server: { proxy: api },
  // The same proxy for the built app, which the booth serves (npm run booth) so the network sees only built files.
  preview: { proxy: api },
});
