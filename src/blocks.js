// Block registry. Each builder returns visual meshes + collider descriptions in
// LOCAL space (block centred on its cell origin, road running along +z).
// track.js rotates by the block's yaw and moves it to the cell.
//
// Colliders are plain data ({ hx,hy,hz, pos:[x,y,z], rot:[x,y,z] euler }) so
// track.js can bake them into Rapier fixed bodies without importing physics here.
import * as THREE from 'three';
import { GRID } from './config.js';

const C = GRID.CELL;
const CY = GRID.CELL_Y;
const HALF = C / 2;

const ROAD = new THREE.MeshLambertMaterial({ color: 0xd9c7a3 });
const EDGE = new THREE.MeshLambertMaterial({ color: 0xb26b3a });

function slab(w = C, d = C, t = 0.5) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), ROAD);
  m.position.y = -t / 2;
  m.receiveShadow = true;
  return {
    meshes: [m],
    colliders: [{ hx: w / 2, hy: t / 2, hz: d / 2, pos: [0, -t / 2, 0], rot: [0, 0, 0] }],
  };
}

// low kerb rails down both sides so you can feel the track edge
function withRails(base, len = C) {
  const h = 0.4, w = 0.4;
  for (const sx of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), EDGE);
    r.position.set(sx * (HALF - w / 2), h / 2 - 0.25, 0);
    base.meshes.push(r);
    base.colliders.push({ hx: w / 2, hy: h / 2, hz: len / 2, pos: [sx * (HALF - w / 2), h / 2 - 0.25, 0], rot: [0, 0, 0] });
  }
  return base;
}

const BUILDERS = {
  straight() {
    return withRails(slab());
  },

  // rises CY over the cell: low edge at z=-HALF (y=0), high edge at z=+HALF (y=CY)
  ramp() {
    const rise = CY, run = C;
    const angle = Math.atan2(rise, run);
    const surfLen = Math.hypot(run, rise);
    const g = new THREE.Mesh(new THREE.BoxGeometry(C, 0.5, surfLen), ROAD);
    g.geometry.translate(0, -0.25, 0);
    g.rotation.x = -angle;
    g.position.set(0, rise / 2, 0);
    g.receiveShadow = true;
    return {
      meshes: [g],
      colliders: [{ hx: C / 2, hy: 0.25, hz: surfLen / 2, pos: [0, rise / 2 - 0.25 * Math.cos(angle), 0], rot: [-angle, 0, 0] }],
    };
  },

  // flat 90-degree turn on a wider pad; road bends left (-x)
  curve_l() {
    return curve(-1);
  },
  curve_r() {
    return curve(1);
  },

  // nothing solid: just a wire outline so the author sees the jump
  gap() {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(C, 0.2, C));
    const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xff5544 }));
    m.position.y = -0.1;
    return { meshes: [m], colliders: [] };
  },
};

function curve(dir) {
  // oversized pad (1.5 cells) gives room to swing the turn
  const w = C * 1.5;
  const base = slab(w, w);
  base.meshes[0].position.set((dir * (w - C)) / 2, base.meshes[0].position.y, (-(w - C)) / 2);
  base.colliders[0].pos[0] = (dir * (w - C)) / 2;
  base.colliders[0].pos[2] = -(w - C) / 2;
  return base;
}

export function buildBlock(type) {
  const b = BUILDERS[type];
  if (!b) throw new Error(`unknown block type: ${type}`);
  return b();
}
