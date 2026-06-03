import type { BandLevels } from "../audio/visualBridge";
import type { GrokSession } from "./sessionTypes";

export type PlayerCommand =
  | { action: "play" }
  | { action: "pause" }
  | { action: "next" }
  | { action: "prev" }
  | { action: "setMood"; payload: GrokSession["mood"] }
  | { action: "loadSession"; payload: GrokSession };

type CommandHandler = (cmd: PlayerCommand) => void | Promise<void>;

const state = {
  title: "Sin pista",
  artist: "",
  playing: false,
  mood: "chill" as GrokSession["mood"],
  bands: { bass: 0, mid: 0, high: 0 } as BandLevels,
  sessionId: "",
};

let handler: CommandHandler | null = null;

export function registerCommandHandler(h: CommandHandler): void {
  handler = h;
}

export async function dispatchCommand(cmd: PlayerCommand): Promise<void> {
  if (handler) await handler(cmd);
}

export function updatePublicState(partial: Partial<typeof state>): void {
  Object.assign(state, partial);
}

export function getPublicState() {
  return { ...state };
}