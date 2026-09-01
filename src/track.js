// Load a track JSON and bake it into the scene + physics world.
// Track JSON shape:
//   { name, author?,
//     start:  { cell:[cx,cy,cz], yaw:deg },
//     finish: { cell:[cx,cy,cz], yaw:deg },
//     blocks: [ { type, cell:[cx,cy,cz], yaw:deg }, ... ] }
import * as THREE from 'three';
import RAPIER from 'rapier';
import { GRID } from './config.js';
import { buildBlock } from './blocks.js';

const { CELL, CELL_Y } = GRID;
const D2R = Math.PI / 180;

function cellToWorld([cx, cy, cz]) {
  return new THREE.Vector3(cx * CELL, cy * CELL_Y, cz * CELL);
}

export function buildTrack(scene, world, json) {
  const group = new THREE.Group();
  scene.add(group);

  for (const blk of json.blocks) {
    const { meshes, colliders } = buildBlock(blk.type);
    const yaw = (blk.yaw || 0) * D2R;
    const origin = cellToWorld(blk.cell);
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    for (const m of meshes) {
      m.position.applyQuaternion(yawQ).add(origin);
      m.quaternion.premultiply(yawQ);
      group.add(m);
    }
    for (const c of colliders) {
      const pos = new THREE.Vector3(...c.pos).applyQuaternion(yawQ).add(origin);
      const rot = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(c.rot[0], c.rot[1], c.rot[2]))
        .premultiply(yawQ);
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(pos.x, pos.y, pos.z)
          .setRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w }),
      );
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz).setFriction(1.0).setRestitution(0),
        body,
      );
    }
  }

  const start = {
    pos: cellToWorld(json.start.cell).add(new THREE.Vector3(0, 0.6, 0)),
    yaw: (json.start.yaw || 0) * D2R,
  };

  // finish: a crossing plane at the cell centre, plus a visible banner
  const fpos = cellToWorld(json.finish.cell);
  const fyaw = (json.finish.yaw || 0) * D2R;
  const fnormal = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), fyaw);
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(CELL, 4),
    new THREE.MeshBasicMaterial({ color: 0x33dd66, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  banner.position.copy(fpos).add(new THREE.Vector3(0, 2, 0));
  banner.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), fyaw);
  group.add(banner);

  const finish = { point: fpos.clone(), normal: fnormal, half: CELL };

  return { group, start, finish, name: json.name };
}
