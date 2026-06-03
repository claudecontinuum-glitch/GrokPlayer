import { AudioEngine } from "../audio/engine";
import { StarshipScene } from "../visuals/scene";
import {
  createSessionFromQueue,
  exportSession,
  parseSession,
} from "../agent/sessionLoader";
import type { PlaylistItem } from "../agent/sessionTypes";
import {
  dispatchCommand,
  registerCommandHandler,
  updatePublicState,
  type PlayerCommand,
} from "../agent/appState";
import type { GrokSession } from "../agent/sessionTypes";

type Track = {
  id: string;
  title: string;
  url: string;
  file?: File;
};

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fileTitle(file: File): string {
  return file.name.replace(/\.[^.]+$/, "");
}

export function initPlayer(): void {
  const audio = document.getElementById("audio") as HTMLAudioElement;
  const canvas = document.getElementById("visual-canvas") as HTMLCanvasElement;
  const engine = new AudioEngine(audio);
  const scene = new StarshipScene(canvas);

  const titleEl = document.getElementById("track-title")!;
  const artistEl = document.getElementById("track-artist")!;
  const queueList = document.getElementById("queue-list")!;
  const btnPlay = document.getElementById("btn-play")!;
  const btnPrev = document.getElementById("btn-prev")!;
  const btnNext = document.getElementById("btn-next")!;
  const seek = document.getElementById("seek") as HTMLInputElement;
  const volume = document.getElementById("volume") as HTMLInputElement;
  const fileInput = document.getElementById("file-input") as HTMLInputElement;
  const timeCurrent = document.getElementById("time-current")!;
  const timeTotal = document.getElementById("time-total")!;
  const barBass = document.getElementById("bar-bass")!;
  const barMid = document.getElementById("bar-mid")!;
  const barHigh = document.getElementById("bar-high")!;
  const sessionPanel = document.getElementById("session-panel")!;
  const sessionJson = document.getElementById("session-json") as HTMLTextAreaElement;

  let queue: Track[] = [];
  let index = -1;
  let mood: GrokSession["mood"] = "chill";
  const objectUrls: string[] = [];

  function revokeAll(): void {
    for (const u of objectUrls) URL.revokeObjectURL(u);
    objectUrls.length = 0;
  }

  function setTrack(i: number): void {
    if (i < 0 || i >= queue.length) return;
    index = i;
    const t = queue[i];
    audio.src = t.url;
    titleEl.textContent = t.title;
    artistEl.textContent = t.file?.name ?? "Archivo local";
    renderQueue();
    updatePublicState({ title: t.title, artist: artistEl.textContent, playing: false });
  }

  function renderQueue(): void {
    queueList.innerHTML = "";
    queue.forEach((t, i) => {
      const li = document.createElement("li");
      li.textContent = t.title;
      if (i === index) li.classList.add("active");
      li.addEventListener("click", () => {
        setTrack(i);
        play();
      });
      queueList.appendChild(li);
    });
  }

  function addFiles(files: FileList | File[]): void {
    for (const file of files) {
      if (!file.type.startsWith("audio/")) continue;
      const url = URL.createObjectURL(file);
      objectUrls.push(url);
      queue.push({
        id: crypto.randomUUID(),
        title: fileTitle(file),
        url,
        file,
      });
    }
    if (index < 0 && queue.length) setTrack(0);
    else renderQueue();
  }

  async function play(): Promise<void> {
    if (!queue.length) return;
    if (index < 0) setTrack(0);
    await engine.resume();
    await audio.play();
    btnPlay.textContent = "⏸";
    engine.onPlay();
    updatePublicState({ playing: true });
  }

  function pause(): void {
    audio.pause();
    btnPlay.textContent = "▶";
    engine.onPause();
    updatePublicState({ playing: false });
  }

  function togglePlay(): void {
    if (audio.paused) void play();
    else pause();
  }

  function next(): void {
    if (!queue.length) return;
    setTrack((index + 1) % queue.length);
    void play();
  }

  function prev(): void {
    if (!queue.length) return;
    if (audio.currentTime > 2) {
      audio.currentTime = 0;
      return;
    }
    setTrack((index - 1 + queue.length) % queue.length);
    void play();
  }

  function buildPlaylistItems(): PlaylistItem[] {
    return queue.map((t) => ({
      id: t.id,
      title: t.title,
      path: t.file?.name ?? t.title,
    }));
  }

  function exportCurrentSession(): void {
    if (!queue.length || index < 0) {
      sessionJson.value = "// Añade música primero";
      return;
    }
    const session = createSessionFromQueue(buildPlaylistItems(), queue[index].id);
    session.mood = mood;
    sessionJson.value = exportSession(session);
  }

  function applySession(raw: string): void {
    const session = parseSession(raw);
    mood = session.mood;
    const paths = new Set(session.playlist.map((p) => p.path));
    const matched = queue.filter((t) => paths.has(t.file?.name ?? t.title));
    if (!matched.length) {
      alert(
        "La sesión lista archivos que aún no cargaste. Abre los mismos archivos y vuelve a aplicar."
      );
      return;
    }
    queue = matched;
    const np = session.nowPlaying;
    const idx = queue.findIndex((t) => t.id === np);
    setTrack(idx >= 0 ? idx : 0);
    void play();
  }

  registerCommandHandler(async (cmd: PlayerCommand) => {
    switch (cmd.action) {
      case "play":
        await play();
        break;
      case "pause":
        pause();
        break;
      case "next":
        next();
        break;
      case "prev":
        prev();
        break;
      case "setMood":
        mood = cmd.payload;
        updatePublicState({ mood });
        break;
      case "loadSession":
        sessionJson.value = exportSession(cmd.payload);
        applySession(sessionJson.value);
        break;
    }
  });

  btnPlay.addEventListener("click", togglePlay);
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", next);
  btnPlay.addEventListener("keydown", (e) => e.preventDefault());

  volume.addEventListener("input", () => engine.setVolume(Number(volume.value)));

  fileInput.addEventListener("change", () => {
    if (fileInput.files) addFiles(fileInput.files);
    fileInput.value = "";
  });

  document.body.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  document.body.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  });

  seek.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (Number(seek.value) / 100) * audio.duration;
  });

  audio.addEventListener("timeupdate", () => {
    const cur = audio.currentTime;
    const dur = audio.duration || 0;
    timeCurrent.textContent = formatTime(cur);
    timeTotal.textContent = formatTime(dur);
    if (dur) seek.value = String((cur / dur) * 100);
  });

  audio.addEventListener("ended", () => next());

  audio.addEventListener("play", () => engine.onPlay());
  audio.addEventListener("pause", () => engine.onPause());

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
      togglePlay();
    }
  });

  document.getElementById("btn-session")!.addEventListener("click", () => {
    sessionPanel.classList.remove("hidden");
    exportCurrentSession();
  });
  document.getElementById("btn-export-session")!.addEventListener("click", exportCurrentSession);
  document.getElementById("btn-import-session")!.addEventListener("click", () => {
    try {
      applySession(sessionJson.value);
    } catch (err) {
      alert(err instanceof Error ? err.message : "JSON inválido");
    }
  });
  document.getElementById("btn-close-session")!.addEventListener("click", () => {
    sessionPanel.classList.add("hidden");
  });

  scene.startLoop(() => {
    const bands = engine.readBands();
    barBass.style.width = `${bands.bass * 100}%`;
    barMid.style.width = `${bands.mid * 100}%`;
    barHigh.style.width = `${bands.high * 100}%`;
    updatePublicState({ bands, playing: !audio.paused, mood });
    return bands;
  });

  window.addEventListener("beforeunload", revokeAll);
}