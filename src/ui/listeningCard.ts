import type { GrokSession } from "../agent/sessionTypes";
import { MOOD_VISUALS } from "../agent/moodConfig";

export type CardInput = {
  title: string;
  artist: string;
  mood: GrokSession["mood"];
  notes: string;
  playing: boolean;
  repoUrl?: string;
};

export function buildListeningCardHtml(data: CardInput): string {
  const moodLabel = MOOD_VISUALS[data.mood].label;
  const status = data.playing ? "▶ En reproducción" : "⏸ Pausado";
  const notesBlock = data.notes
    ? `<p class="notes">${escapeHtml(data.notes)}</p>`
    : `<p class="notes dim">Sin notas del agente aún.</p>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>GrokPlayer — ${escapeHtml(data.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(160deg, #12001f, #2d1b69 45%, #ff6ec7);
      color: #e8e0f0;
    }
    .card {
      width: min(420px, 92vw);
      padding: 1.5rem;
      border-radius: 16px;
      background: rgba(10, 8, 20, 0.85);
      border: 2px solid #00f5ff;
      box-shadow: 0 0 40px rgba(0, 245, 255, 0.25);
    }
    h1 { margin: 0; font-size: 1.25rem; color: #c4ff7a; }
    .artist { color: #9a8fb8; font-size: 0.9rem; margin: 0.25rem 0 1rem; }
    .ascii {
      font-family: Consolas, monospace;
      font-size: 0.55rem;
      line-height: 1.1;
      color: #00f5ff;
      white-space: pre;
      margin: 0 0 1rem;
      opacity: 0.9;
    }
    .meta { font-size: 0.8rem; color: #00f5ff; }
    .notes { font-size: 0.85rem; margin-top: 1rem; padding: 0.75rem;
      background: rgba(0,0,0,0.35); border-left: 3px solid #ff2bd6; border-radius: 4px; }
    .dim { opacity: 0.6; }
    .footer { margin-top: 1rem; font-size: 0.7rem; color: #6a6080; }
    a { color: #00f5ff; }
  </style>
</head>
<body>
  <div class="card">
    <pre class="ascii">${STARSHIP_ASCII}</pre>
    <h1>${escapeHtml(data.title)}</h1>
    <p class="artist">${escapeHtml(data.artist)}</p>
    <p class="meta">${status} · Mood: <strong>${moodLabel}</strong></p>
    ${notesBlock}
    <p class="footer">GrokPlayer — momento compartido humano + agente<br/>
    ${data.repoUrl ? `<a href="${escapeHtml(data.repoUrl)}">${escapeHtml(data.repoUrl)}</a>` : ""}</p>
  </div>
</body>
</html>`;
}

const STARSHIP_ASCII = `       /\\
      /  \\
     |    |
     |    |
    /|====|\\
   / |    | \\
  /__|____|__\\
     | || |
    🔥 🔥 🔥`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function openListeningCard(data: CardInput): void {
  const html = buildListeningCardHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  const a = document.createElement("a");
  a.href = url;
  a.download = `grokplayer-${data.title.replace(/[^\w.-]+/g, "_").slice(0, 40)}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}