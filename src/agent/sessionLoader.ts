import type { GrokSession, PlaylistItem } from "./sessionTypes";

export function parseSession(json: string): GrokSession {
  const data = JSON.parse(json) as GrokSession;
  if (data.version !== 1) throw new Error("Versión de sesión no soportada");
  if (!data.playlist?.length) throw new Error("La sesión necesita al menos una pista");
  return data;
}

export function createSessionFromQueue(
  items: PlaylistItem[],
  nowPlayingId: string,
  host = "human"
): GrokSession {
  return {
    version: 1,
    sessionId: crypto.randomUUID(),
    host,
    guests: ["hermes"],
    playlist: items,
    nowPlaying: nowPlayingId,
    startedAt: new Date().toISOString(),
    visualPreset: "starship-synthwave",
    mood: "chill",
    notes: "",
  };
}

export function exportSession(session: GrokSession): string {
  return JSON.stringify(session, null, 2);
}