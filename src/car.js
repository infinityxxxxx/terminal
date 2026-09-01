// The wedge: a flat 3D triangle, one wheel at the nose, two at the base.
// This file is just the visual shell + Rapier body lifecycle. All the physics
// (and all the tuning) lives in carphys.js so it can run headless.
import * as THREE from 'three';
import { createCarBody, stepCar } from './carphys.js';
import { CAR } from './config.js';

let RAPIER; // injected once from main so this file has no direct rapier import path

export function setRapier(r) {
  RAPIER = r;
}

function wedgeMesh() {
  const g = new THREE.Group();

  const [hw, hh, hl] = [0.7, 0.22, 1.1]; // nose at +z, base at -z
  const p = [
    [-hw, -hh, -hl], [hw, -hh, -hl], [0, -hh, hl],
    [-hw, hh, -hl], [hw, hh, -hl], [0, hh, hl],
  ];
  const tris = [
    [0, 2, 1], [3, 4, 5],
    [0, 1, 4], [0, 4, 3],
    [1, 2, 5], [1, 5, 4],
    [2, 0, 3], [2, 3, 5],
  ];
  const pos = [];
  for (const t of tris) for (const vi of t) pos.push(...p[vi]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xff7733 }));
  body.castShadow = true;
  g.add(body);

  const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.18, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  g.userData.wheels = CAR.WHEELS.map((w) => {
    const m = new THREE.Mesh(wheelGeo, wheelMat);
    m.position.set(...w);
    g.add(m);
    return m;
  });
  return g;
}

export class Car {
  constructor(scene, world, start) {
    this.world = world;
    this.mesh = wedgeMesh();
    scene.add(this.mesh);
    this.body = createCarBody(RAPIER, world);
    this.grounded = false;
    this.speedKmh = 0;
    this.respawn(start);
  }

  respawn(start) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), start.yaw);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setTranslation({ x: start.pos.x, y: start.pos.y, z: start.pos.z }, true);
    this.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    this.speedKmh = 0;
    this.syncMesh();
  }

  // held dead-still at the start line until the race begins: no suspension
  // settle, no creep, no phantom acceleration.
  freeze() {
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setBodyType(RAPIER.RigidBodyType.Fixed, true);
  }
  unfreeze() {
    this.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  }

  get pose() {
    const t = this.body.translation();
    const r = this.body.rotation();
    return [t.x, t.y, t.z, r.x, r.y, r.z, r.w];
  }

  control(input) {
    const s = stepCar(RAPIER, this.world, this.body, input);
    this.grounded = s.grounded;
    this.speedKmh = s.speedKmh;
  }

  syncMesh() {
    const t = this.body.translation();
    const r = this.body.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    const spin = this.speedKmh * 0.02;
    for (const w of this.mesh.userData.wheels) w.rotation.x -= spin;
  }
}
