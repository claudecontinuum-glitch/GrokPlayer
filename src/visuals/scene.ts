import * as THREE from "three";
import { createStarshipVisual, type StarshipVisual } from "./starshipGeometry";
import {
  getSmoothedBands,
  idleBands,
  isPlaying,
  type BandLevels,
} from "../audio/visualBridge";
import type { GrokSession } from "../agent/sessionTypes";
import { MOOD_VISUALS } from "../agent/moodConfig";
import { getMood } from "../agent/appState";

const CYAN = 0x00f5ff;
const MAGENTA = 0xff2bd6;
const PLUME_HOT = 0xff9e3d;

export type SceneVisualState = {
  bands: BandLevels;
  reducedMotion: boolean;
  mood?: GrokSession["mood"];
};

export class StarshipScene {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private shipVisual: StarshipVisual;
  private stars: THREE.Points;
  private grid: THREE.LineSegments;
  private sun: THREE.LineSegments;
  private horizon: THREE.Mesh;
  private clock = new THREE.Clock();
  private orbitAngle = 0.55;
  private reducedMotion: boolean;
  private bgColor = new THREE.Color(0x12001f);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    this.scene = new THREE.Scene();
    this.scene.background = this.bgColor.clone();
    this.scene.fog = new THREE.FogExp2(0x3d2068, 0.055);

    this.camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.1, 80);
    this.camera.position.set(4.8, 1.85, 5.4);

    this.horizon = this.createHorizonGradient();
    this.scene.add(this.horizon);

    this.grid = this.createSynthGrid();
    this.scene.add(this.grid);

    this.sun = this.createSun();
    this.scene.add(this.sun);

    this.stars = this.createStars(520);
    this.scene.add(this.stars);

    this.shipVisual = createStarshipVisual();
    this.scene.add(this.shipVisual.root);

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private createHorizonGradient(): THREE.Mesh {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#12001f");
    g.addColorStop(0.45, "#2d1b69");
    g.addColorStop(0.72, "#8b3a8f");
    g.addColorStop(0.88, "#ff6ec7");
    g.addColorStop(1, "#ffb347");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(42, 32, 16), mat);
    mesh.position.y = 8;
    return mesh;
  }

  private createSun(): THREE.LineSegments {
    const pts: number[] = [];
    const y = 1.15;
    const z = -14;
    const r = 1.35;
    for (let i = 0; i <= 32; i++) {
      const t = (i / 32) * Math.PI * 2;
      const x = Math.cos(t) * r;
      const zz = z + Math.sin(t) * r * 0.35;
      if (i > 0) {
        const t0 = ((i - 1) / 32) * Math.PI * 2;
        pts.push(
          Math.cos(t0) * r, y, z + Math.sin(t0) * r * 0.35,
          x, y, zz
        );
      }
    }
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2;
      pts.push(0, y, z, Math.cos(t) * r * 1.4, y, z + Math.sin(t) * r * 0.35);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffc46b,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.LineSegments(geo, mat);
  }

  private createStars(count: number): THREE.Points {
    const pos: number[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < count; i++) {
      pos.push(
        (Math.random() - 0.5) * 50,
        2 + Math.random() * 20,
        -8 - Math.random() * 35
      );
      sizes.push(0.04 + Math.random() * 0.08);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.07,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  /** Grid synthwave en perspectiva hacia el sol */
  private createSynthGrid(): THREE.LineSegments {
    const lines: number[] = [];
    const floorY = -2.65;
    const vanishZ = -6;
    const vanishY = -1.2;

    for (let i = -12; i <= 12; i++) {
      const x = i * 0.55;
      lines.push(x, floorY, 6, 0, vanishY, vanishZ);
    }
    for (let row = 0; row < 14; row++) {
      const t = row / 13;
      const z = 6 - t * 14;
      const y = floorY + t * (vanishY - floorY) * 0.35;
      const half = 2 + t * 9;
      lines.push(-half, y, z, half, y, z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xff6ec7,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.LineSegments(geo, mat);
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private updateShipMaterials(bass: number, mid: number, mood: GrokSession["mood"]): void {
    const mv = MOOD_VISUALS[mood];
    const hullMat = this.shipVisual.hull.material as THREE.LineBasicMaterial;
    const glowMat = this.shipVisual.glow.material as THREE.LineBasicMaterial;
    const plumeMat = this.shipVisual.plume.material as THREE.LineBasicMaterial;

    const t = Math.min(1, bass * 2.8 * mv.magentaBias + mv.magentaBias * 0.12);
    const hullColor = new THREE.Color(CYAN).lerp(new THREE.Color(MAGENTA), t);
    hullMat.color.copy(hullColor);
    hullMat.opacity = 0.78 + mid * 0.22;
    glowMat.color.copy(hullColor);
    glowMat.opacity = 0.15 + bass * 0.35;

    plumeMat.color.lerpColors(new THREE.Color(PLUME_HOT), new THREE.Color(MAGENTA), t);
    plumeMat.opacity = 0.35 + bass * 0.65;
  }

  tick(external?: SceneVisualState): void {
    const elapsed = this.clock.getElapsedTime();
    const bands =
      external?.bands ??
      (isPlaying() ? getSmoothedBands() : idleBands(elapsed));
    const rm = external?.reducedMotion ?? this.reducedMotion;
    const mood = external?.mood ?? getMood();
    const mv = MOOD_VISUALS[mood];

    const orbitSpeed = (0.1 + bands.mid * 0.09) * mv.orbitMult;
    this.orbitAngle += orbitSpeed * 0.016;

    const pathX = Math.sin(this.orbitAngle * 0.65) * 0.45;
    const pathZ = Math.cos(this.orbitAngle) * 0.35 - 0.8;
    const pathY = Math.sin(elapsed * 0.45) * 0.06;
    const root = this.shipVisual.root;
    root.position.set(pathX, pathY, pathZ);

    const bank = Math.sin(elapsed * 0.85) * 0.05 + bands.mid * 0.05;
    root.rotation.set(0.42 + Math.sin(elapsed * 0.25) * 0.04, this.orbitAngle * 0.12, bank);

    const scale = 1 + bands.bass * (rm ? 0.02 : 0.09) * mv.bassScaleMult;
    root.scale.setScalar(scale);

    const plumeScaleY = 0.65 + bands.bass * (rm ? 0.1 : 0.85);
    this.shipVisual.plume.scale.set(1, plumeScaleY, 1);
    this.shipVisual.plume.position.y = -bands.bass * 0.08;

    const camR = 5.8;
    const camX = Math.cos(this.orbitAngle) * camR;
    const camZ = Math.sin(this.orbitAngle) * camR;
    const shake = rm ? 0 : bands.bass * 0.1 * mv.shakeMult;
    this.camera.position.set(
      camX + Math.sin(elapsed * 11) * shake,
      1.75 + bands.mid * 0.35,
      camZ + 0.9 + Math.cos(elapsed * 10) * shake
    );
    this.camera.lookAt(pathX, 0.15 + pathY, pathZ);

    this.updateShipMaterials(bands.bass, bands.mid, mood);

    const starMat = this.stars.material as THREE.PointsMaterial;
    starMat.opacity = 0.45 + bands.high * 0.55;
    this.stars.rotation.y = elapsed * 0.018 * mv.starSpeed;

    const gridMat = this.grid.material as THREE.LineBasicMaterial;
    gridMat.opacity = 0.22 + bands.mid * 0.45;

    const sunMat = this.sun.material as THREE.LineBasicMaterial;
    sunMat.opacity = 0.4 + bands.high * 0.35;

    this.bgColor.setHex(0x12001f);
    this.bgColor.lerp(new THREE.Color(0x2a1048), bands.mid * 0.25);
    this.scene.background = this.bgColor;

    this.renderer.render(this.scene, this.camera);
  }

  startLoop(getFrameState?: () => { bands: BandLevels; mood: GrokSession["mood"] }): void {
    const frame = () => {
      const fb = getFrameState?.();
      const bands =
        fb?.bands ??
        (isPlaying() ? getSmoothedBands() : idleBands(this.clock.getElapsedTime()));
      const mood = fb?.mood ?? getMood();
      this.tick({ bands, mood, reducedMotion: this.reducedMotion });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}