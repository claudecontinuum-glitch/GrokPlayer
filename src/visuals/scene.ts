import * as THREE from "three";
import { createStarshipLineObject } from "./starshipGeometry";
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
  private ship: THREE.LineSegments;
  private stars: THREE.Points;
  private grid: THREE.LineSegments;
  private clock = new THREE.Clock();
  private orbitAngle = 0;
  private reducedMotion: boolean;

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
    this.scene.background = new THREE.Color(0x12001f);
    this.scene.fog = new THREE.FogExp2(0x2d1b69, 0.08);

    this.camera = new THREE.PerspectiveCamera(42, 4 / 3, 0.1, 80);
    this.camera.position.set(5, 2.2, 5);

    this.ship = createStarshipLineObject();
    this.scene.add(this.ship);

    this.stars = this.createStars(420);
    this.scene.add(this.stars);

    this.grid = this.createSynthGrid();
    this.scene.add(this.grid);

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private createStars(count: number): THREE.Points {
    const pos: number[] = [];
    for (let i = 0; i < count; i++) {
      pos.push(
        (Math.random() - 0.5) * 40,
        Math.random() * 18 + 2,
        (Math.random() - 0.5) * 40 - 10
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.06,
      transparent: true,
      opacity: 0.85,
    });
    return new THREE.Points(geo, mat);
  }

  private createSynthGrid(): THREE.LineSegments {
    const lines: number[] = [];
    const y = -2.8;
    for (let i = -8; i <= 8; i++) {
      lines.push(i * 0.8, y, -12, i * 0.8, y, 4);
    }
    for (let z = -12; z <= 4; z += 1.2) {
      lines.push(-6.4, y, z, 6.4, y, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xff6ec7,
      transparent: true,
      opacity: 0.35,
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

  private lerpColor(bass: number, mood: GrokSession["mood"]): void {
    const mat = this.ship.material as THREE.LineBasicMaterial;
    const mv = MOOD_VISUALS[mood];
    const t = Math.min(1, bass * 2.5 * mv.magentaBias + mv.magentaBias * 0.15);
    const c = new THREE.Color(CYAN).lerp(new THREE.Color(MAGENTA), t);
    mat.color.copy(c);
    mat.opacity = 0.75 + getSmoothedBands().mid * 0.25;
  }

  tick(external?: SceneVisualState): void {
    const elapsed = this.clock.getElapsedTime();
    const bands =
      external?.bands ??
      (isPlaying() ? getSmoothedBands() : idleBands(elapsed));
    const rm = external?.reducedMotion ?? this.reducedMotion;
    const mood = external?.mood ?? getMood();
    const mv = MOOD_VISUALS[mood];

    const orbitSpeed = (0.12 + bands.mid * 0.08) * mv.orbitMult;
    this.orbitAngle += orbitSpeed * 0.016;

    const pathX = Math.sin(this.orbitAngle * 0.7) * 0.6;
    const pathZ = Math.cos(this.orbitAngle) * 0.5 - 1;
    this.ship.position.set(pathX, Math.sin(elapsed * 0.5) * 0.08, pathZ);

    const scale = 1 + bands.bass * (rm ? 0.02 : 0.08) * mv.bassScaleMult;
    this.ship.scale.setScalar(scale);
    this.ship.rotation.z = Math.sin(elapsed * 0.9) * 0.06 + bands.mid * 0.04;
    this.ship.rotation.x = 0.35 + Math.sin(elapsed * 0.3) * 0.05;

    const camR = 6.2;
    const camX = Math.cos(this.orbitAngle) * camR;
    const camZ = Math.sin(this.orbitAngle) * camR;
    const shake = rm ? 0 : bands.bass * 0.12 * mv.shakeMult;
    this.camera.position.set(
      camX + Math.sin(elapsed * 12) * shake,
      2.2 + bands.mid * 0.4,
      camZ + Math.cos(elapsed * 11) * shake
    );
    this.camera.lookAt(pathX, 0.3, pathZ);

    this.lerpColor(bands.bass, mood);

    const starMat = this.stars.material as THREE.PointsMaterial;
    starMat.opacity = 0.5 + bands.high * 0.5;
    this.stars.rotation.y = elapsed * 0.02 * mv.starSpeed;

    const gridMat = this.grid.material as THREE.LineBasicMaterial;
    gridMat.opacity = 0.2 + bands.mid * 0.35;

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