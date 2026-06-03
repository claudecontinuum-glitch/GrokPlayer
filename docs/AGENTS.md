# Guía para agentes (Hermes y otros)

GrokPlayer expone estado y comandos mientras corre `npm run dev` en `http://localhost:5173`.

## Estado

```http
GET /api/state
```

Respuesta ejemplo:

```json
{
  "title": "Mi canción",
  "artist": "track.mp3",
  "playing": true,
  "mood": "chill",
  "bands": { "bass": 0.4, "mid": 0.2, "high": 0.1 }
}
```

## Comandos

```http
POST /api/command
Content-Type: application/json

{ "action": "play" }
{ "action": "pause" }
{ "action": "next" }
{ "action": "prev" }
{ "action": "setMood", "payload": "energy" }
{ "action": "setNotes", "payload": "Hermes: buena para estudiar" }
{ "action": "proposeSession", "payload": { ...session } }
{ "action": "applyPending" }
{ "action": "rejectPending" }
{ "action": "loadSession", "payload": { ...session } }
```

**Co-pilot:** usa `proposeSession` para que el humano vea el banner y pulse **Aplicar propuesta**. No uses `loadSession` si quieres que el humano confirme.

## MCP server (Hermes)

Con `npm run dev` activo:

```bash
cd mcp-server && npm install
```

Config del cliente MCP:

```json
{
  "grokplayer": {
    "command": "node",
    "args": ["C:/Users/.../GrokPlayer/mcp-server/index.js"],
    "env": { "GROKPLAYER_URL": "http://127.0.0.1:5173" }
  }
}
```

Tools: `grokplayer_state`, `grokplayer_play`, `grokplayer_pause`, `grokplayer_next`, `grokplayer_set_mood`, `grokplayer_set_notes`, `grokplayer_propose_session`.

## Ritual sugerido

1. Pregunta al humano qué mood quiere (`chill`, `energy`, `focus`).
2. Lee `/api/state` tras iniciar una pista.
3. Deja una nota en `notes` del JSON de sesión exportado.
4. No intentes reproducir archivos que no existen en la máquina del humano.

## UI humana

El humano usa **Abrir música**, **Sesión**, y espacio = play/pause. Los agentes no sustituyen la experiencia visual — la complementan.