export type PlaylistItem = {
  id: string;
  title: string;
  path: string;
};

export type GrokSession = {
  version: 1;
  sessionId: string;
  host: string;
  guests: string[];
  playlist: PlaylistItem[];
  nowPlaying: string;
  startedAt: string;
  visualPreset: string;
  mood: "chill" | "energy" | "focus";
  notes?: string;
};