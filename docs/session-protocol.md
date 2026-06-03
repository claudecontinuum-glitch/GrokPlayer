# Protocolo de sesión GrokPlayer

Archivo: `*.grokplayer.json` o cualquier JSON que cumpla este esquema.

## Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `version` | `1` | Versión del protocolo |
| `sessionId` | UUID | Identificador único |
| `host` | string | Humano anfitrión |
| `guests` | string[] | Agentes invitados (p. ej. `hermes`) |
| `playlist` | array | `{ id, title, path }` — `path` es nombre o ruta local |
| `nowPlaying` | string | `id` de la pista actual |
| `startedAt` | ISO-8601 | Inicio de la sesión |
| `visualPreset` | string | p. ej. `starship-synthwave` |
| `mood` | `chill` \| `energy` \| `focus` | Vibe sugerido |
| `notes` | string? | Notas del agente o del humano |

## Flujo humano + agente

1. Humano carga música y pulsa **Sesión → Exportar**.
2. Pega el JSON en Discord/Telegram o lo guarda en el repo bajo `sessions/`.
3. Agente edita `mood`, `notes` o reordena `playlist`.
4. Humano **Aplicar sesión** tras cargar los mismos archivos (por nombre en `path`).

## Limitación v1

No se suben archivos de audio en la sesión — solo metadatos. Cada oyente debe tener los archivos localmente.