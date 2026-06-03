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
  subscribe,
  setPendingSession,
  getPublicState,
  type PlayerCommand,
} from "../agent/appState";
import type { GrokSession } from "../agent/sessionTypes";
import { isMood, MOOD_VISUALS } from "../agent/moodConfig";
import { openListeningCard } from "./listeningCard";

type Track = {
  id: string;
  title: string;
  url: string;
  file?: File;
};

const REPO_URL = "https://github.com/claudecontinuum-glitch/GrokPlayer";

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
  const notesEl = document.getElementById("lcd-notes")!;
  const moodBadge = document.getElementById("mood-badge")!;
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
  const copilotBanner = document.getElementById("copilot-banner")!;
  const copilotSummary = document.getElementById("copilot-summary")!;
  const notesInput = document.getElementById("session-notes-input") as HTMLTextAreaElement;
  const moodSelect = document.getElementById("mood-select") as HTMLSelectElement;

  let queue: Track[] = [];
  let index = -1;
  let mood: GrokSession["mood"] = "chill";
  let sessionNotes = "";
  const objectUrls: string[] = [];

  function syncMoodUi(): void {
    moodSelect.value = mood;
    moodBadge.textContent = MOOD_VISUALS[mood].label;
    moodBadge.dataset.mood = mood;
    document.body.dataset.mood = mood;
  }

  function syncNotesUi(): void {
    const text = sessionNotes.trim();
    notesEl.textContent = text ? `💬 ${text}` : "";
    notesEl.classList.toggle("hidden", !text);
    notesInput.value = sessionNotes;
  }

  function syncCopilotBanner(): void {
    const pending = getPublicState().pendingSession;
    if (!pending) {
      copilotBanner.classList.add("hidden");
      return;
    }
    copilotBanner.classList.remove("hidden");
    const count = pending.playlist.length;
    const who = pending.guests.join(", ") || "agente";
    copilotSummary.textContent = `${who} propone ${count} pista(s) · mood ${pending.mood}${pending.notes ? ` — ${pending.notes.slice(0, 60)}` : ""}`;
  }

  function refreshUiFromState(): void {
    const s = getPublicState();
    mood = s.mood;
    sessionNotes = s.notes;
    syncMoodUi();
    syncNotesUi();
    syncCopilotBanner();
  }

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
    updatePublicState({
      title: t.title,
      artist: artistEl.textContent,
      playing: false,
      sessionId: getPublicState().sessionId,
    });
  }

  function renderQueue(): void {
    queueList.innerHTML = "";
    queue.forEach((t, i) => {
      const li = document.createElement("li");
      li.textContent = t.title;
      if (i === index) li.classList.add("active");
      li.addEventListener("click", () => {
        setTrack(i);
        void play();
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

  function exportCurrentSession(): GrokSession | null {
    if (!queue.length || index < 0) {
      sessionJson.value = "// Añade música primero";
      return null;
    }
    const session = createSessionFromQueue(buildPlaylistItems(), queue[index].id);
    session.mood = mood;
    session.notes = sessionNotes;
    sessionJson.value = exportSession(session);
    updatePublicState({ sessionId: session.sessionId });
    return session;
  }

  function applySessionData(session: GrokSession, fromCopilot = false): void {
    mood = session.mood;
    sessionNotes = session.notes ?? "";
    syncMoodUi();
    syncNotesUi();

    const pathToTrack = new Map<string, Track>();
    for (const t of queue) {
      pathToTrack.set(t.file?.name ?? t.title, t);
      pathToTrack.set(t.title, t);
    }

    const newQueue: Track[] = [];
    for (const item of session.playlist) {
      const t = pathToTrack.get(item.path) ?? pathToTrack.get(item.title);
      if (t) newQueue.push({ ...t, id: item.id, title: item.title });
    }

    if (!newQueue.length) {
      if (fromCopilot) {
        alert("Carga primero los archivos que el agente listó en la sesión, luego aplica de nuevo.");
      } else {
        alert("La sesión lista archivos que aún no cargaste. Abre los mismos archivos y vuelve a aplicar.");
      }
      return;
    }

    queue = newQueue;
    const idx = queue.findIndex((t) => t.id === session.nowPlaying);
    setTrack(idx >= 0 ? idx : 0);
    updatePublicState({
      mood,
      notes: sessionNotes,
      sessionId: session.sessionId,
      pendingSession: null,
    });
    setPendingSession(null);
    syncCopilotBanner();
    void play();
  }

  function proposeSession(session: GrokSession): void {
    setPendingSession(session);
    sessionJson.value = exportSession(session);
    updatePublicState({ pendingSession: session });
    syncCopilotBanner();
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
        syncMoodUi();
        updatePublicState({ mood });
        break;
      case "setNotes":
        sessionNotes = cmd.payload;
        syncNotesUi();
        updatePublicState({ notes: sessionNotes });
        break;
      case "proposeSession":
        proposeSession(cmd.payload);
        break;
      case "applyPending": {
        const pending = getPublicState().pendingSession;
        if (pending) applySessionData(pending, true);
        break;
      }
      case "rejectPending":
        setPendingSession(null);
        updatePublicState({ pendingSession: null });
        syncCopilotBanner();
        break;
      case "loadSession":
        applySessionData(cmd.payload);
        sessionJson.value = exportSession(cmd.payload);
        break;
    }
  });

  moodSelect.addEventListener("change", () => {
    const v = moodSelect.value;
    if (isMood(v)) void dispatchCommand({ action: "setMood", payload: v });
  });

  notesInput.addEventListener("change", () => {
    void dispatchCommand({ action: "setNotes", payload: notesInput.value });
  });

  btnPlay.addEventListener("click", togglePlay);
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", next);

  volume.addEventListener("input", () => engine.setVolume(Number(volume.value)));

  fileInput.addEventListener("change", () => {
    if (fileInput.files) addFiles(fileInput.files);
    fileInput.value = "";
  });

  document.body.addEventListener("dragover", (e) => e.preventDefault());
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
  document.getElementById("btn-export-session")!.addEventListener("click", () => exportCurrentSession());
  document.getElementById("btn-import-session")!.addEventListener("click", () => {
    try {
      const session = parseSession(sessionJson.value);
      proposeSession(session);
    } catch (err) {
      alert(err instanceof Error ? err.message : "JSON inválido");
    }
  });
  document.getElementById("btn-apply-session")!.addEventListener("click", () => {
    try {
      applySessionData(parseSession(sessionJson.value));
    } catch (err) {
      alert(err instanceof Error ? err.message : "JSON inválido");
    }
  });
  document.getElementById("btn-close-session")!.addEventListener("click", () => {
    sessionPanel.classList.add("hidden");
  });

  document.getElementById("btn-apply-copilot")!.addEventListener("click", () => {
    void dispatchCommand({ action: "applyPending" });
  });
  document.getElementById("btn-dismiss-copilot")!.addEventListener("click", () => {
    void dispatchCommand({ action: "rejectPending" });
  });

  document.getElementById("btn-listening-card")!.addEventListener("click", () => {
    openListeningCard({
      title: titleEl.textContent ?? "Sin pista",
      artist: artistEl.textContent ?? "",
      mood,
      notes: sessionNotes,
      playing: !audio.paused,
      repoUrl: REPO_URL,
    });
  });

  subscribe(refreshUiFromState);
  syncMoodUi();

  scene.startLoop(() => {
    const bands = engine.readBands();
    barBass.style.width = `${bands.bass * 100}%`;
    barMid.style.width = `${bands.mid * 100}%`;
    barHigh.style.width = `${bands.high * 100}%`;
    updatePublicState({ bands, playing: !audio.paused, mood, notes: sessionNotes });
    return { bands, mood };
  });

  window.addEventListener("beforeunload", revokeAll);
}