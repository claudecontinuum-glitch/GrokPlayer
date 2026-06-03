# GrokPlayer MCP Server

Expone herramientas para que Hermes (u otro agente) controle el reproductor mientras corre `npm run dev` en la raíz del repo.

## Instalación

```bash
cd mcp-server
npm install
```

## Configuración (ejemplo)

```json
{
  "mcpServers": {
    "grokplayer": {
      "command": "node",
      "args": ["C:/Users/TU_USUARIO/OneDrive/Desktop/GrokPlayer/mcp-server/index.js"],
      "env": {
        "GROKPLAYER_URL": "http://127.0.0.1:5173"
      }
    }
  }
}
```

## Tools

| Tool | Descripción |
|------|-------------|
| `grokplayer_state` | Estado actual |
| `grokplayer_play` / `pause` / `next` | Transporte |
| `grokplayer_set_mood` | chill \| energy \| focus |
| `grokplayer_set_notes` | Texto en el LCD |
| `grokplayer_propose_session` | Propuesta co-pilot (human confirma) |