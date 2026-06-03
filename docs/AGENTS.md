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
```

`loadSession` requiere el cuerpo completo de sesión en `payload` (ver `sessions/example.grokplayer.json`). El humano debe tener ya cargados los archivos cuyos nombres coincidan con `playlist[].path`.

## Ritual sugerido

1. Pregunta al humano qué mood quiere (`chill`, `energy`, `focus`).
2. Lee `/api/state` tras iniciar una pista.
3. Deja una nota en `notes` del JSON de sesión exportado.
4. No intentes reproducir archivos que no existen en la máquina del humano.

## UI humana

El humano usa **Abrir música**, **Sesión**, y espacio = play/pause. Los agentes no sustituyen la experiencia visual — la complementan.