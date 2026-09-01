// Per-track personal best + ghost, stored in localStorage. No backend.
// A run is recorded as the car pose (pos+quat) every fixed step. The ghost
// replays that; the live split is a sliding nearest-point search against it.
import * as THREE from 'three';
import { FIXED_DT } from './config.js';

const key = (track) => `wedge:pb:${track}`;

export function loadPB(track) {
  try {
    const raw = localStorage.getItem(key(track));
    if (!raw) return null;
    const pb = JSON.parse(raw);
    return pb && pb.frames && pb.frames.length ? pb : null;
  } catch {
    return null;
  }
}

// returns true if this run is a new PB and was saved
export function savePB(track, time, frames) {
  const cur = loadPB(track);
  if (cur && cur.time <= time) return false;
  try {
    localStorage.setItem(key(track), JSON.stringify({ time, frames }));
    return true;
  } catch {
    return false; // quota — just don't save
  }
}

export class Recorder {
  constructor() {
    this.frames = [];
  }
  reset() {
    this.frames.length = 0;
  }
  push(pose) {
    this.frames.push(...pose); // 7 numbers
  }
  get count() {
    return this.frames.length / 7;
  }
}

export class Ghost {
  constructor(scene, pb) {
    this.pb = pb;
    this.n = pb ? pb.frames.length / 7 : 0;
    this.searchIdx = 0;

    const geo = new THREE.ConeGeometry(0.7, 2.2, 3);
    geo.rotateX(Math.PI / 2); // point +z
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    this.mesh.visible = !!pb;
    scene.add(this.mesh);
  }

  reset() {
    this.searchIdx = 0;
  }

  // place the ghost at the given elapsed frame count
  showAt(frameCount) {
    if (!this.n) return;
    const i = Math.min(this.n - 1, frameCount) * 7;
    const f = this.pb.frames;
    this.mesh.position.set(f[i], f[i + 1], f[i + 2]);
    this.mesh.quaternion.set(f[i + 3], f[i + 4], f[i + 5], f[i + 6]);
  }

  // seconds the player is ahead(-) / behind(+) their PB at this position
  split(carPos, playerElapsed) {
    if (!this.n) return null;
    const f = this.pb.frames;
    let bestI = this.searchIdx;
    let bestD = Infinity;
    const end = Math.min(this.n, this.searchIdx + 150);
    for (let i = this.searchIdx; i < end; i++) {
      const j = i * 7;
      const dx = f[j] - carPos.x, dy = f[j + 1] - carPos.y, dz = f[j + 2] - carPos.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) { bestD = d; bestI = i; }
    }
    this.searchIdx = bestI;
    return playerElapsed - bestI * FIXED_DT;
  }
}
