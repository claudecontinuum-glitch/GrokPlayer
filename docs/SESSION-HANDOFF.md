# GrokPlayer — Handoff de sesión (2026-06-03)

Documento para retomar en otra sesión con Grok, Claude o Hermes. **Leer esto primero.**

---

## Qué es el proyecto

**GrokPlayer** no es Spotify. Es un **framework de experiencia** para escuchar **archivos de música locales** en el navegador, con visualizador retro (pantalla MP3) y un **SpaceX Starship en wireframe 3D synthwave** que reacciona al audio. Pensado para que **humanos y agentes** (p. ej. Hermes) compartan momentos vía sesiones JSON y API/MCP — sin subir música a la nube.

---

## Repo GitHub

| Campo | Valor |
|-------|--------|
| URL | https://github.com/claudecontinuum-glitch/GrokPlayer |
| Cuenta | `claudecontinuum-glitch` (transferir a cuenta personal de Ale si se desea) |
| Rama | `master` |
| Último commit relevante | `v0.3` — pulido visual Starship |

---

## Cómo arrancar (Windows)

```bash
cd C:\Users\administrador_it\OneDrive\Desktop\GrokPlayer
git pull
npm install
npm run dev
```

Abrir: **http://localhost:5173/**

Build producción: `npm run build` → carpeta `dist/`

---

## Historial de lo hecho en esta sesión

### Fase 0 — Diseño (`/design`)
- Plan aprobado: web + Vite + TS + Three.js wireframe + Web Audio + sesiones JSON + API agentes.
- Decisiones por defecto: **UI español**, marco MP3 **retro oscuro**, Starship **solo upper stage** (sin Super Heavy completo).
- Diagrama Mermaid no se renderiza en panel Plan de Cursor; se añadió ASCII + nota para usar GitHub / mermaid.live.

### v0.1 — Implementación inicial (PR1–PR6)
- Scaffold Vite + TypeScript + Three.js.
- Reproductor: play/pause, cola, drag & drop, volumen, seek, estética MP3.
- `AudioEngine` + `AnalyserNode` + bandas graves/medios/agudos (EMA).
- Geometría procedural Starship + escena loop synthwave.
- Reactividad audio → escala, color, shake, estrellas.
- Sesiones JSON export/import.
- API en dev: `GET /api/state`, `POST /api/command`.
- Docs: `VISION.md`, `session-protocol.md`, `AGENTS.md`, `STarship-checklist.md`.
- Repo creado y subido; excluidos `mcps/` y `terminals/` del git.

### v0.2 — Humanos + agentes
- Selector **Vibe**: chill / energy / focus (afecta animación vía `moodConfig.ts`).
- **Notas** en LCD + campo en panel Sesión.
- **Co-pilot**: `proposeSession` → banner → humano **Aplicar propuesta** / **Descartar** (el agente no cambia la cola sin confirmación).
- **Listening card**: botón Tarjeta → HTML descargable para compartir.
- API ampliada: `setNotes`, `proposeSession`, `applyPending`, `rejectPending`.
- **MCP server** en `mcp-server/` (tools: state, play, pause, next, set_mood, set_notes, propose_session).

### v0.3 — Pulido visual Starship (último trabajo)
- Silueta mejorada: fairing, falda/interstage, grid fins tipo placa, patas, campanas Raptor con garganta.
- Capas separadas: **hull**, **glow** (additive), **plume** (llamas que escalan con graves).
- Escena: gradiente en esfera, **sol** wireframe, **grid en perspectiva**, más estrellas, cámara 3/4.
- Guía de tuning: `docs/VISUAL-TUNING.md`.
- Checklist actualizado: `docs/STarship-checklist.md`.

---

## Mapa de archivos clave

```
GrokPlayer/
  index.html              # UI MP3 + LCD canvas
  src/main.ts
  src/audio/
    engine.ts             # Web Audio
    visualBridge.ts       # Bandas EMA + idle
  src/visuals/
    starshipGeometry.ts   # ← PULIR FORMA (constante SHIP)
    scene.ts              # ← PULIR CIELO, GRID, CÁMARA
  src/ui/
    playerChrome.ts       # Lógica reproductor + sesiones
    playerChrome.css
    listeningCard.ts
  src/agent/
    appState.ts           # Estado público + comandos
    sessionLoader.ts
    sessionTypes.ts
    moodConfig.ts
  vite.config.ts          # Plugin API /api/*
  mcp-server/index.js     # MCP para Hermes
  sessions/example.grokplayer.json
  docs/
    SESSION-HANDOFF.md    # ← ESTE ARCHIVO
    VISUAL-TUNING.md
    AGENTS.md
    VISION.md
    session-protocol.md
```

---

## API agentes (requiere `npm run dev`)

```bash
curl http://localhost:5173/api/state
curl -X POST http://localhost:5173/api/command -H "Content-Type: application/json" -d "{\"action\":\"play\"}"
```

| action | payload | Notas |
|--------|---------|--------|
| play, pause, next, prev | — | Transporte |
| setMood | chill \| energy \| focus | Vibe visual |
| setNotes | string | Texto en LCD |
| proposeSession | GrokSession | Co-pilot; humano confirma |
| applyPending / rejectPending | — | Tras propose |
| loadSession | GrokSession | Aplica directo (sin banner) |

---

## MCP Hermes

```bash
cd mcp-server && npm install
```

Config ejemplo en `docs/AGENTS.md` y `mcp-server/README.md`. Variable `GROKPLAYER_URL=http://127.0.0.1:5173`.

---

## Open questions (sin cerrar)

1. ¿Repo en cuenta personal de Ale vs `claudecontinuum-glitch`?
2. ¿UI bilingüe o solo español? (hoy: español)
3. ¿Añadir Super Heavy acoplado al wireframe?
4. ¿Deploy GitHub Pages / Vercel? (audio sigue siendo local; solo UI estática en hosting)
5. ¿Carátulas / metadata ID3 en LCD?

---

## Próximos pasos sugeridos (orden)

1. **Probar visual** con 2–3 pistas (bass / vocal / ambient) y anotar ajustes en `SHIP`.
2. **Probar ritual Hermes**: proposeSession → aplicar → set_notes → tarjeta.
3. **Carátulas** o preset visual por mood más extremo.
4. **GitHub Pages** para demo del UI (sin streaming).
5. **MCP** integrado en config real de Hermes-NousResearch.

---

## Comandos git rápidos

```bash
git pull
git status
git add -A && git commit -m "mensaje" && git push origin master
```

---

## Contexto del usuario (Ale)

- No programa; prefiere pulir **constantes** y UX con el asistente.
- Objetivo emocional: app donde **valga la pena sentarse a escuchar** música local, humanos y agentes compartiendo el momento.
- Agente de referencia: **Hermes** (NousResearch / co-pilot).
- Workspace local: `C:\Users\administrador_it\OneDrive\Desktop\GrokPlayer`

---

## Frase para retomar en nueva sesión

> "Sigamos GrokPlayer — lee `docs/SESSION-HANDOFF.md` y [objetivo: visual / Hermes / deploy]."

*Generado al cerrar sesión 2026-06-03.*