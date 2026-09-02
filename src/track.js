// Load a track JSON and bake it into the scene + physics world.
// Track JSON shape:
//   { name, author?,
//     start:  { cell:[cx,cy,cz], yaw:deg },
//     finish: { cell:[cx,cy,cz], yaw:deg },
//     checkpoints?: [ { cell:[cx,cy,cz], yaw:deg }, ... ],   // optional; auto if omitted
//     blocks: [ { type, cell:[cx,cy,cz], yaw:deg }, ... ] }
//
// Checkpoints are NOT gates — you never have to drive through them. They only
// mark where the ghost split is measured (yellow), so a jump that skips one is
// legal, you just don't get that split.
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

  const gate = (cell, yawDeg, color, height, opacity) => {
    const pos = cellToWorld(cell);
    const yaw = (yawDeg || 0) * D2R;
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(CELL, height),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide }),
    );
    banner.position.copy(pos).add(new THREE.Vector3(0, height / 2 + 0.1, 0));
    banner.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    group.add(banner);
    return {
      point: pos.clone(),
      normal: new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
      half: CELL,
    };
  };

  const finish = gate(json.finish.cell, json.finish.yaw, 0x33dd66, 4, 0.35);

  // checkpoints: explicit list, or one every 3rd block between start and finish
  const cpDefs = json.checkpoints ?? autoCheckpoints(json);
  const checkpoints = cpDefs.map((c) => gate(c.cell, c.yaw, 0xffd21e, 3, 0.3));

  return {
    group,
    start,
    finish,
    checkpoints,
    name: json.name,
    blocks: json.blocks,
    startCell: json.start.cell,
    finishCell: json.finish.cell,
  };
}

function autoCheckpoints(json) {
  const finishKey = json.finish.cell.join(',');
  const out = [];
  for (let i = 3; i < json.blocks.length - 1; i += 3) {
    const b = json.blocks[i];
    if (b.type === 'gap' || b.cell.join(',') === finishKey) continue;
    out.push({ cell: b.cell, yaw: b.yaw || 0 });
  }
  return out;
}
