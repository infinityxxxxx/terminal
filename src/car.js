// Low-poly car, PolyTrack style: chunky body, small cabin, little spoiler,
// four corner wheels. This file is just the visual shell + Rapier body
// lifecycle. All the physics (and tuning) lives in carphys.js so it runs
// headless.
import * as THREE from 'three';
import { createCarBody, stepCar } from './carphys.js';
import { CAR } from './config.js';

let RAPIER; // injected once from main so this file has no direct rapier import path

export function setRapier(r) {
  RAPIER = r;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function carMesh() {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: 0x4a90d9 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x24486e });
  const rubber = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  g.add(box(1.05, 0.34, 1.7, paint, 0, 0.02, -0.05)); // main body (nose at +z)
  g.add(box(0.92, 0.24, 0.62, paint, 0, -0.06, 0.78)); // lower nose
  g.add(box(0.78, 0.32, 0.72, dark, 0, 0.32, -0.18)); // cabin
  g.add(box(0.92, 0.05, 0.22, dark, 0, 0.28, -0.92)); // spoiler

  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  g.userData.wheels = CAR.WHEELS.map((w) => {
    const m = new THREE.Mesh(wheelGeo, rubber);
    m.position.set(...w);
    m.castShadow = true;
    g.add(m);
    return m;
  });
  return g;
}

export class Car {
  constructor(scene, world, start) {
    this.world = world;
    this.mesh = carMesh();
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
