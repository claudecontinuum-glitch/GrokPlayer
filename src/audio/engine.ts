import {
  bandsFromAnalyser,
  smoothBands,
  setPlaying,
  type BandLevels,
} from "./visualBridge";

export class AudioEngine {
  private audio: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private connected = false;

  constructor(audioElement: HTMLAudioElement) {
    this.audio = audioElement;
  }

  async ensureContext(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.75;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    this.source = this.ctx.createMediaElementSource(this.audio);
    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.connected = true;
  }

  async resume(): Promise<void> {
    await this.ensureContext();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  get element(): HTMLAudioElement {
    return this.audio;
  }

  readBands(): BandLevels {
    if (!this.analyser || !this.connected) {
      return { bass: 0, mid: 0, high: 0 };
    }
    this.analyser.getByteFrequencyData(this.freqData);
    return smoothBands(bandsFromAnalyser(this.freqData));
  }

  onPlay(): void {
    setPlaying(true);
  }

  onPause(): void {
    setPlaying(false);
  }

  setVolume(v: number): void {
    this.audio.volume = Math.max(0, Math.min(1, v));
  }
}