import { defineConfig, type Plugin } from "vite";
import { dispatchCommand, getPublicState } from "./src/agent/appState";
import type { GrokSession } from "./src/agent/sessionTypes";

function grokPlayerApiPlugin(): Plugin {
  return {
    name: "grokplayer-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) return next();

        res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (url === "/api/state" && req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(getPublicState()));
          return;
        }

        if (url === "/api/command" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const cmd = JSON.parse(body) as {
                action: string;
                payload?: unknown;
              };
              if (cmd.action === "play") await dispatchCommand({ action: "play" });
              else if (cmd.action === "pause") await dispatchCommand({ action: "pause" });
              else if (cmd.action === "next") await dispatchCommand({ action: "next" });
              else if (cmd.action === "prev") await dispatchCommand({ action: "prev" });
              else if (cmd.action === "setMood")
                await dispatchCommand({
                  action: "setMood",
                  payload: cmd.payload as GrokSession["mood"],
                });
              else if (cmd.action === "loadSession")
                await dispatchCommand({
                  action: "loadSession",
                  payload: cmd.payload as GrokSession,
                });
              else {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Acción desconocida" }));
                return;
              }
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true, state: getPublicState() }));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
          return;
        }

        res.statusCode = 404;
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [grokPlayerApiPlugin()],
  server: {
    port: 5173,
  },
});