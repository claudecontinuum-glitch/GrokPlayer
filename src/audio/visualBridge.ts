export type BandLevels = {
  bass: number;
  mid: number;
  high: number;
};

const EMA = 0.82;

let smoothed: BandLevels = { bass: 0, mid: 0, high: 0 };
let playing = false;

export function setPlaying(value: boolean): void {
  playing = value;
}

export function isPlaying(): boolean {
  return playing;
}

export function smoothBands(raw: BandLevels): BandLevels {
  smoothed = {
    bass: smoothed.bass * EMA + raw.bass * (1 - EMA),
    mid: smoothed.mid * EMA + raw.mid * (1 - EMA),
    high: smoothed.high * EMA + raw.high * (1 - EMA),
  };
  return { ...smoothed };
}

export function getSmoothedBands(): BandLevels {
  return { ...smoothed };
}

/** Idle breathing when paused — slow synthetic pulse */
export function idleBands(timeSec: number): BandLevels {
  const t = timeSec * 0.8;
  return {
    bass: 0.08 + Math.sin(t) * 0.04,
    mid: 0.1 + Math.sin(t * 1.3 + 1) * 0.05,
    high: 0.06 + Math.sin(t * 0.7 + 2) * 0.03,
  };
}

export function bandsFromAnalyser(data: Uint8Array): BandLevels {
  const len = data.length;
  if (len === 0) return { bass: 0, mid: 0, high: 0 };

  const third = Math.floor(len / 3);
  let bSum = 0,
    mSum = 0,
    hSum = 0;

  for (let i = 0; i < third; i++) bSum += data[i];
  for (let i = third; i < third * 2; i++) mSum += data[i];
  for (let i = third * 2; i < len; i++) hSum += data[i];

  const bN = third || 1;
  const mN = third || 1;
  const hN = len - third * 2 || 1;

  return {
    bass: bSum / bN / 255,
    mid: mSum / mN / 255,
    high: hSum / hN / 255,
  };
}