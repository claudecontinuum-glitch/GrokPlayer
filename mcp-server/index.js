#!/usr/bin/env node
/**
 * MCP server para GrokPlayer — requiere `npm run dev` en el repo (puerto 5173).
 * Config en el cliente MCP:
 * { "command": "node", "args": [".../GrokPlayer/mcp-server/index.js"], "env": { "GROKPLAYER_URL": "http://127.0.0.1:5173" } }
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.GROKPLAYER_URL ?? "http://127.0.0.1:5173";

async function api(command, payload) {
  const res = await fetch(`${BASE}/api/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: command, payload }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

async function getState() {
  const res = await fetch(`${BASE}/api/state`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const server = new McpServer({ name: "grokplayer", version: "0.1.0" });

server.tool(
  "grokplayer_state",
  "Estado actual del reproductor (pista, mood, bandas, sesión pendiente)",
  {},
  async () => {
    const state = await getState();
    return { content: [{ type: "text", text: JSON.stringify(state, null, 2) }] };
  }
);

server.tool(
  "grokplayer_play",
  "Reproducir música",
  {},
  async () => {
    const r = await api("play");
    return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
  }
);

server.tool(
  "grokplayer_pause",
  "Pausar música",
  {},
  async () => {
    const r = await api("pause");
    return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
  }
);

server.tool(
  "grokplayer_next",
  "Siguiente pista",
  {},
  async () => {
    const r = await api("next");
    return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
  }
);

server.tool(
  "grokplayer_set_mood",
  "Cambiar vibe visual (chill, energy, focus)",
  { mood: z.enum(["chill", "energy", "focus"]) },
  async ({ mood }) => {
    const r = await api("setMood", mood);
    return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
  }
);

server.tool(
  "grokplayer_set_notes",
  "Escribir notas visibles en el LCD para el humano",
  { notes: z.string() },
  async ({ notes }) => {
    const r = await api("setNotes", notes);
    return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
  }
);

server.tool(
  "grokplayer_propose_session",
  "Proponer sesión (cola + mood) — el humano debe pulsar Aplicar propuesta",
  {
    sessionJson: z.string().describe("JSON completo de sesión GrokPlayer"),
  },
  async ({ sessionJson }) => {
    const session = JSON.parse(sessionJson);
    const r = await api("proposeSession", session);
    return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);