# GrokPlayer

Reproductor web local con visualizador **SpaceX Starship** en wireframe 3D synthwave, reactivo al audio. Estética MP3 retro. Pensado para que **humanos y agentes** (p. ej. Hermes) compartan sesiones de escucha sin ser un Spotify.

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior
- Navegador moderno (Chrome, Edge, Firefox)

## Inicio rápido

```bash
git clone <tu-repo>
cd GrokPlayer
npm install
npm run dev
```

Abre la URL que muestra Vite (normalmente `http://localhost:5173`).

1. Pulsa **Abrir música** o arrastra archivos (MP3, WAV, OGG, FLAC…).
2. **▶** reproduce; el Starship en la pantalla LCD reacciona a graves, medios y agudos.
3. **Vibe** (chill / energy / focus) cambia la animación y el badge en el LCD.
4. **Sesión** — el agente **previsualiza** con JSON; tú **Aplicar propuesta** en el banner.
5. **Tarjeta** exporta un HTML bonito para compartir el momento (Discord, Telegram).

## Pulir la animación

Constantes y forma del cohete:

- [`src/visuals/starshipGeometry.ts`](src/visuals/starshipGeometry.ts) — proporciones, aletas, motores
- [`src/visuals/scene.ts`](src/visuals/scene.ts) — colores, órbita, estrellas, grid

Colores synthwave por defecto: cian `#00f5ff`, magenta `#ff2bd6`.

## API para agentes (con `npm run dev`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/state` | Título, playing, mood, bandas |
| POST | `/api/command` | `{ "action": "play" \| "pause" \| "next" \| "prev" \| "setMood", "payload": "chill" }` |

Ejemplo:

```bash
curl http://localhost:5173/api/state
curl -X POST http://localhost:5173/api/command -H "Content-Type: application/json" -d "{\"action\":\"play\"}"
```

Ver [`docs/AGENTS.md`](docs/AGENTS.md) y [`docs/session-protocol.md`](docs/session-protocol.md).

### MCP para Hermes

```bash
cd mcp-server && npm install
```

Añade el servidor en tu config MCP (ver `docs/AGENTS.md`). Requiere `npm run dev` en otra terminal.

## Build para publicar

```bash
npm run build
npm run preview
```

La carpeta `dist/` se puede subir a GitHub Pages o Vercel.

## Licencia

MIT — ver [LICENSE](LICENSE).