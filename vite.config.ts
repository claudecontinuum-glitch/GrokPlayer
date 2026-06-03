import { defineConfig, type Plugin } from "vite";
import { dispatchCommand, getPublicState } from "./src/agent/appState";
import type { GrokSession } from "./src/agent/sessionTypes";
import { isMood } from "./src/agent/moodConfig";

function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function grokPlayerApiPlugin(): Plugin {
  return {
    name: "grokplayer-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) return next();

        const origin = req.headers.origin ?? "";
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
          res.setHeader("Access-Control-Allow-Origin", origin);
        }
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        const json = (code: number, data: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        };

        try {
          if (url === "/api/state" && req.method === "GET") {
            json(200, getPublicState());
            return;
          }

          if (url === "/api/command" && req.method === "POST") {
            const body = await readBody(req);
            const cmd = JSON.parse(body) as { action: string; payload?: unknown };
            await runCommand(cmd);
            json(200, { ok: true, state: getPublicState() });
            return;
          }

          res.statusCode = 404;
          res.end();
        } catch (e) {
          json(400, { error: String(e) });
        }
      });
    },
  };
}

async function runCommand(cmd: { action: string; payload?: unknown }): Promise<void> {
  switch (cmd.action) {
    case "play":
      await dispatchCommand({ action: "play" });
      break;
    case "pause":
      await dispatchCommand({ action: "pause" });
      break;
    case "next":
      await dispatchCommand({ action: "next" });
      break;
    case "prev":
      await dispatchCommand({ action: "prev" });
      break;
    case "setMood": {
      const m = cmd.payload as string;
      if (!isMood(m)) throw new Error("mood inválido");
      await dispatchCommand({ action: "setMood", payload: m });
      break;
    }
    case "setNotes":
      await dispatchCommand({ action: "setNotes", payload: String(cmd.payload ?? "") });
      break;
    case "proposeSession":
      await dispatchCommand({
        action: "proposeSession",
        payload: cmd.payload as GrokSession,
      });
      break;
    case "applyPending":
      await dispatchCommand({ action: "applyPending" });
      break;
    case "rejectPending":
      await dispatchCommand({ action: "rejectPending" });
      break;
    case "loadSession":
      await dispatchCommand({
        action: "loadSession",
        payload: cmd.payload as GrokSession,
      });
      break;
    default:
      throw new Error("Acción desconocida");
  }
}

export default defineConfig({
  plugins: [grokPlayerApiPlugin()],
  server: { port: 5173 },
});