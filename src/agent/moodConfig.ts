import type { GrokSession } from "./sessionTypes";

export type MoodVisual = {
  orbitMult: number;
  shakeMult: number;
  bassScaleMult: number;
  magentaBias: number;
  starSpeed: number;
  label: string;
};

export const MOOD_VISUALS: Record<GrokSession["mood"], MoodVisual> = {
  chill: {
    orbitMult: 0.75,
    shakeMult: 0.4,
    bassScaleMult: 0.7,
    magentaBias: 0.3,
    starSpeed: 0.6,
    label: "Chill",
  },
  energy: {
    orbitMult: 1.35,
    shakeMult: 1.4,
    bassScaleMult: 1.2,
    magentaBias: 0.85,
    starSpeed: 1.5,
    label: "Energy",
  },
  focus: {
    orbitMult: 0.9,
    shakeMult: 0.15,
    bassScaleMult: 0.5,
    magentaBias: 0.15,
    starSpeed: 0.4,
    label: "Focus",
  },
};

export function isMood(value: string): value is GrokSession["mood"] {
  return value === "chill" || value === "energy" || value === "focus";
}