import * as THREE from "three";

/**
 * Constantes para pulir la silueta — edita aquí con calma.
 * Proporción inspirada en Starship upper stage (no mesh oficial).
 */
export const SHIP = {
  bodyRadius: 0.52,
  coneHeight: 1.25,
  bodyHeight: 3.0,
  finHeight: 0.42,
  finSpan: 0.38,
  engineY: -2.15,
  engineRadius: 0.11,
  skirtHeight: 0.22,
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

/** Aleta grid estilo SpaceX — placa triangular + refuerzo */
function gridFin(baseY: number, angle: number): Segment[] {
  const { bodyRadius, finHeight, finSpan } = SHIP;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const rootOut = new THREE.Vector3(ca * bodyRadius, baseY, sa * bodyRadius);
  const rootIn = new THREE.Vector3(ca * (bodyRadius - 0.06), baseY + 0.05, sa * (bodyRadius - 0.06));
  const topOut = new THREE.Vector3(ca * (bodyRadius + finSpan), baseY + finHeight, sa * (bodyRadius + finSpan));
  const topIn = new THREE.Vector3(ca * (bodyRadius + finSpan * 0.35), baseY + finHeight * 0.85, sa * (bodyRadius + finSpan * 0.35));
  const midFold = new THREE.Vector3(ca * (bodyRadius + finSpan * 0.7), baseY + finHeight * 0.45, sa * (bodyRadius + finSpan * 0.7));

  return [
    seg(rootOut, topOut),
    seg(rootIn, topIn),
    seg(rootOut, rootIn),
    seg(topOut, topIn),
    seg(rootOut, midFold),
    seg(midFold, topOut),
  ];
}

function engineBell(y: number, x: number, z: number, r: number): Segment[] {
  const out: Segment[] = [];
  out.push(...ringToSegments(ringY(y, r, 10).map((p) => new THREE.Vector3(p.x + x, p.y, p.z + z))));
  out.push(...ringToSegments(ringY(y - 0.06, r * 0.55, 6).map((p) => new THREE.Vector3(p.x + x, p.y, p.z + z))));
  const throat = new THREE.Vector3(x, y - 0.1, z);
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2;
    out.push(seg(throat, new THREE.Vector3(x + Math.cos(t) * r, y, z + Math.sin(t) * r)));
  }
  return out;
}

function ringToSegments(pts: THREE.Vector3[]): Segment[] {
  return connectRing(pts);
}

function buildHullSegments(): Segment[] {
  const { bodyRadius, coneHeight, bodyHeight, engineY, skirtHeight } = SHIP;
  const coneBaseY = bodyHeight * 0.5;
  const bodyBottomY = -bodyHeight * 0.5;
  const finBaseY = bodyBottomY + 0.22;
  const segments: Segment[] = [];

  segments.push(...coneLines(coneBaseY + coneHeight, coneBaseY, bodyRadius, 10));

  const noseTip = new THREE.Vector3(0, coneBaseY + coneHeight + 0.08, 0);
  const noseRing = ringY(coneBaseY + coneHeight * 0.72, bodyRadius * 0.12, 6);
  for (const p of noseRing) segments.push(seg(noseTip, p));
  segments.push(...connectRing(ringY(coneBaseY + coneHeight * 0.45, bodyRadius * 0.32, 8)));
  segments.push(...connectRing(noseRing));

  const ringSegs = 12;
  const rings = [
    ringY(coneBaseY, bodyRadius, ringSegs),
    ringY(coneBaseY * 0.35, bodyRadius, ringSegs),
    ringY(0, bodyRadius, ringSegs),
    ringY(bodyBottomY, bodyRadius * 1.03, ringSegs),
  ];
  for (const r of rings) segments.push(...connectRing(r));
  segments.push(...connectVertical(rings));

  const skirtTop = bodyBottomY - 0.02;
  const skirtBot = skirtTop - skirtHeight;
  segments.push(
    ...coneLines(skirtTop, skirtBot, bodyRadius * 1.12, 10).map(([a, b]) => {
      return [a, b] as Segment;
    })
  );

  const interstage = ringY(skirtBot, bodyRadius * 1.14, 14);
  segments.push(...connectRing(interstage));

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    segments.push(...gridFin(finBaseY, angle));
  }

  const legY = skirtBot + 0.04;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI * 0.5;
    const lx = Math.cos(a) * (bodyRadius + 0.05);
    const lz = Math.sin(a) * (bodyRadius + 0.05);
    segments.push(
      seg(new THREE.Vector3(lx, legY, lz), new THREE.Vector3(lx * 1.08, legY - 0.18, lz * 1.08))
    );
  }

  segments.push(
    seg(new THREE.Vector3(0, coneBaseY * 0.2, bodyRadius), new THREE.Vector3(0, bodyBottomY, bodyRadius))
  );

  const engineOffsets: [number, number][] = [
    [0, 0],
    [0.2, 0.11],
    [-0.2, 0.11],
  ];
  for (const [ex, ez] of engineOffsets) {
    segments.push(...engineBell(engineY, ex, ez, SHIP.engineRadius));
  }

  return segments;
}

/** Llamas separadas — la escena las escala con los graves */
export function buildPlumeSegments(): Segment[] {
  const y = SHIP.engineY - 0.12;
  const segments: Segment[] = [];
  const layers = [
    { spread: 0.1, depth: 0.45 },
    { spread: 0.2, depth: 0.75 },
    { spread: 0.28, depth: 1.0 },
  ];
  for (const { spread, depth } of layers) {
    const tip = new THREE.Vector3(0, y - depth, 0);
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2;
      const base = new THREE.Vector3(Math.cos(t) * spread, y, Math.sin(t) * spread);
      segments.push(seg(base, tip));
    }
    segments.push(
      seg(new THREE.Vector3(-spread, y, 0), new THREE.Vector3(spread, y, 0)),
      seg(new THREE.Vector3(0, y, -spread), new THREE.Vector3(0, y, spread))
    );
  }
  return segments;
}

function segmentsToGeometry(segments: Segment[]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const [a, b] of segments) {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

function lineObj(
  segments: Segment[],
  color: number,
  opacity: number,
  name: string,
  blending: THREE.Blending = THREE.NormalBlending
): THREE.LineSegments {
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending,
    depthWrite: blending === THREE.NormalBlending,
  });
  const mesh = new THREE.LineSegments(segmentsToGeometry(segments), mat);
  mesh.name = name;
  return mesh;
}

export type StarshipVisual = {
  root: THREE.Group;
  hull: THREE.LineSegments;
  glow: THREE.LineSegments;
  plume: THREE.LineSegments;
};

export function createStarshipVisual(): StarshipVisual {
  const hullSegs = buildHullSegments();
  const hull = lineObj(hullSegs, 0x00f5ff, 0.92, "hull");
  const glow = lineObj(hullSegs, 0x00f5ff, 0.22, "glow", THREE.AdditiveBlending);
  glow.scale.setScalar(1.03);

  const plume = lineObj(buildPlumeSegments(), 0xff6ec7, 0.75, "plume", THREE.AdditiveBlending);

  const root = new THREE.Group();
  root.name = "starship";
  root.add(glow);
  root.add(hull);
  root.add(plume);

  root.rotation.order = "YXZ";
  return { root, hull, glow, plume };
}

/** @deprecated Usar createStarshipVisual */
export function createStarshipLineObject(): THREE.LineSegments {
  return createStarshipVisual().hull;
}