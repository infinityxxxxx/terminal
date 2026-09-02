// Per-track personal best + ghost, stored in localStorage. No backend.
// A run is recorded as the car pose (pos+quat) every fixed step, plus the frame
// index at each checkpoint. The ghost replays the poses; the split is measured
// only at checkpoints (see main.js) — no fuzzy nearest-point guessing.
import * as THREE from 'three';
import { FIXED_DT } from './config.js';

const key = (track) => `terminal:pb:${track}`;

export function loadPB(track) {
  try {
    const raw = localStorage.getItem(key(track));
    if (!raw) return null;
    const pb = JSON.parse(raw);
    if (!pb || !pb.frames || !pb.frames.length) return null;
    if (!Array.isArray(pb.cpFrames)) pb.cpFrames = []; // older saves
    return pb;
  } catch {
    return null;
  }
}

// returns true if this run is a new PB and was saved
export function savePB(track, time, frames, cpFrames) {
  const cur = loadPB(track);
  if (cur && cur.time <= time) return false;
  try {
    localStorage.setItem(key(track), JSON.stringify({ time, frames, cpFrames }));
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
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.5, 1.9),
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    scene.add(this.mesh);
    this.setPB(pb);
  }

  setPB(pb) {
    this.pb = pb;
    this.n = pb ? pb.frames.length / 7 : 0;
    this.cpTimes = (pb?.cpFrames || []).map((f) => f * FIXED_DT);
    this.mesh.visible = !!pb;
  }

  reset() {}

  // place the ghost at the given elapsed frame count
  showAt(frameCount) {
    if (!this.n) return;
    const i = Math.min(this.n - 1, Math.max(0, frameCount)) * 7;
    const f = this.pb.frames;
    this.mesh.position.set(f[i], f[i + 1], f[i + 2]);
    this.mesh.quaternion.set(f[i + 3], f[i + 4], f[i + 5], f[i + 6]);
  }
}
