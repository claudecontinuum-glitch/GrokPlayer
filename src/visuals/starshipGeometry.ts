import * as THREE from "three";

/** Constantes fáciles de pulir — proporciones SpaceX Starship (upper stage) */
export const SHIP = {
  totalHeight: 4.2,
  bodyRadius: 0.45,
  coneHeight: 1.05,
  bodyHeight: 2.85,
  finHeight: 0.35,
  finWidth: 0.28,
  engineY: -2.05,
  engineRadius: 0.12,
} as const;

type Segment = [THREE.Vector3, THREE.Vector3];

function seg(a: THREE.Vector3, b: THREE.Vector3): Segment {
  return [a, b];
}

function ringY(y: number, r: number, segments: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
  }
  return pts;
}

function connectRing(pts: THREE.Vector3[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < pts.length; i++) {
    out.push(seg(pts[i], pts[(i + 1) % pts.length]));
  }
  return out;
}

function connectVertical(rings: THREE.Vector3[][]): Segment[] {
  const out: Segment[] = [];
  const n = rings[0].length;
  for (let i = 0; i < n; i++) {
    for (let r = 0; r < rings.length - 1; r++) {
      out.push(seg(rings[r][i], rings[r + 1][i]));
    }
  }
  return out;
}

function coneLines(apexY: number, baseY: number, baseR: number, sides: number): Segment[] {
  const base = ringY(baseY, baseR, sides);
  const apex = new THREE.Vector3(0, apexY, 0);
  const out = connectRing(base);
  for (const p of base) out.push(seg(apex, p));
  return out;
}

function gridFin(baseY: number, angle: number): Segment[] {
  const { finHeight, finWidth, bodyRadius } = SHIP;
  const cx = Math.cos(angle) * bodyRadius;
  const cz = Math.sin(angle) * bodyRadius;
  const nx = Math.cos(angle);
  const nz = Math.sin(angle);
  const root = new THREE.Vector3(cx, baseY, cz);
  const tip = new THREE.Vector3(cx + nx * finWidth, baseY + finHeight * 0.3, cz + nz * finWidth);
  const top = new THREE.Vector3(cx, baseY + finHeight, cz);
  const inner = new THREE.Vector3(cx - nx * finWidth * 0.35, baseY + finHeight * 0.5, cz - nz * finWidth * 0.35);
  return [seg(root, tip), seg(tip, top), seg(top, inner), seg(inner, root), seg(root, top)];
}

function engineCircle(y: number, x: number, z: number, r: number, segs: number): Segment[] {
  const out: Segment[] = [];
  let prev: THREE.Vector3 | null = null;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const p = new THREE.Vector3(x + Math.cos(t) * r, y, z + Math.sin(t) * r);
    if (prev) out.push(seg(prev, p));
    prev = p;
  }
  return out;
}

function flameLines(y: number, spread: number): Segment[] {
  const out: Segment[] = [];
  const base = [
    new THREE.Vector3(-spread, y, 0),
    new THREE.Vector3(spread, y, 0),
    new THREE.Vector3(0, y, -spread),
    new THREE.Vector3(0, y, spread),
  ];
  const tip = new THREE.Vector3(0, y - 0.55, 0);
  for (const b of base) out.push(seg(b, tip));
  return out;
}

/** Construye segmentos de línea del Starship (upper stage). */
export function buildStarshipSegments(): Segment[] {
  const { bodyRadius, coneHeight, bodyHeight, engineY, engineRadius } = SHIP;
  const coneBaseY = bodyHeight * 0.5;
  const bodyBottomY = -bodyHeight * 0.5;
  const finBaseY = bodyBottomY + 0.15;

  const segments: Segment[] = [];

  segments.push(...coneLines(coneBaseY + coneHeight, coneBaseY, bodyRadius, 8));

  const ringSegs = 10;
  const bodyTop = ringY(coneBaseY, bodyRadius, ringSegs);
  const bodyMid = ringY(0, bodyRadius, ringSegs);
  const bodyLow = ringY(bodyBottomY, bodyRadius * 1.02, ringSegs);
  segments.push(...connectRing(bodyTop), ...connectRing(bodyMid), ...connectRing(bodyLow));
  segments.push(...connectVertical([bodyTop, bodyMid, bodyLow]));

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    segments.push(...gridFin(finBaseY, angle));
  }

  const engineOffsets = [
    [0, 0],
    [0.22, 0.12],
    [-0.22, 0.12],
  ];
  for (const [ex, ez] of engineOffsets) {
    segments.push(...engineCircle(engineY, ex, ez, engineRadius, 8));
  }

  segments.push(...flameLines(engineY - 0.08, 0.14));

  return segments;
}

export function segmentsToGeometry(segments: Segment[]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const [a, b] of segments) {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

export function createStarshipLineObject(): THREE.LineSegments {
  const geo = segmentsToGeometry(buildStarshipSegments());
  const mat = new THREE.LineBasicMaterial({
    color: 0x00f5ff,
    transparent: true,
    opacity: 0.95,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.name = "starship";
  return lines;
}