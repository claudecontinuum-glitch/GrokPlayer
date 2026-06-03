import type { BandLevels } from "../audio/visualBridge";
import type { GrokSession } from "./sessionTypes";

export type PlayerCommand =
  | { action: "play" }
  | { action: "pause" }
  | { action: "next" }
  | { action: "prev" }
  | { action: "setMood"; payload: GrokSession["mood"] }
  | { action: "setNotes"; payload: string }
  | { action: "proposeSession"; payload: GrokSession }
  | { action: "applyPending" }
  | { action: "rejectPending" }
  | { action: "loadSession"; payload: GrokSession };

type CommandHandler = (cmd: PlayerCommand) => void | Promise<void>;

export type PublicState = {
  title: string;
  artist: string;
  playing: boolean;
  mood: GrokSession["mood"];
  notes: string;
  bands: BandLevels;
  sessionId: string;
  pendingSession: GrokSession | null;
};

const state: PublicState = {
  title: "Sin pista",
  artist: "",
  playing: false,
  mood: "chill",
  notes: "",
  bands: { bass: 0, mid: 0, high: 0 },
  sessionId: "",
  pendingSession: null,
};

let handler: CommandHandler | null = null;
const listeners = new Set<() => void>();

export function registerCommandHandler(h: CommandHandler): void {
  handler = h;
}

export async function dispatchCommand(cmd: PlayerCommand): Promise<void> {
  if (handler) await handler(cmd);
  notify();
}

export function updatePublicState(partial: Partial<PublicState>): void {
  Object.assign(state, partial);
  notify();
}

export function getPublicState(): PublicState {
  return { ...state };
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function setPendingSession(session: GrokSession | null): void {
  state.pendingSession = session;
  notify();
}

export function getMood(): GrokSession["mood"] {
  return state.mood;
}