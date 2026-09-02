// Pure car physics: Rapier only, no three.js, no DOM. car.js wraps this with a
// mesh; sim_check.mjs drives it headlessly in Node. This is the file to test
// and tune — the feel lives here.
//
// ponytail: arcade model (per-wheel spring + lateral-grip scrub + direct yaw),
// not a real tyre model. Swap for Rapier's DynamicRayCastVehicleController if
// the feel plateaus. The AIR branch deliberately touches nothing but tiny
// assists — momentum is kept exactly (rule #1: no slowdown in the air).
import { PHYS, CAR } from './config.js';

// --- tiny vec/quat toolkit (plain {x,y,z} / {x,y,z,w}) ---
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
function norm(a) {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}
// rotate vector v by quaternion q
function qrot(q, v) {
  const u = { x: q.x, y: q.y, z: q.z };
  const t = scale(cross(u, v), 2);
  return add(add(v, scale(t, q.w)), cross(u, t));
}

export function createCarBody(RAPIER, world) {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setCcdEnabled(true)
      .setLinearDamping(0) // air rule: zero drag
      .setAngularDamping(0.2)
      .setCanSleep(false),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(...CAR.HALF).setDensity(CAR.DENSITY).setFriction(0.4).setRestitution(0),
    body,
  );
  return body;
}

// call BEFORE world.step(). input: { throttle: -1..1, steer: -1..1 }
// returns { grounded, speedKmh } for the HUD / camera.
export function stepCar(RAPIER, world, body, input) {
  const IDT = 1 / 60;
  const q = body.rotation();
  const up = qrot(q, { x: 0, y: 1, z: 0 });
  const fwd = qrot(q, { x: 0, y: 0, z: 1 });
  const right = qrot(q, { x: 1, y: 0, z: 0 });
  const lin = body.linvel();
  const vel = { x: lin.x, y: lin.y, z: lin.z };
  const t = body.translation();
  const mass = body.mass();

  // --- suspension: one ray per wheel, down the car's up axis ---
  let hits = 0;
  let groundN = { x: 0, y: 0, z: 0 };
  for (const w of CAR.WHEELS) {
    const anchor = add(qrot(q, { x: w[0], y: w[1], z: w[2] }), t);
    const ray = new RAPIER.Ray(anchor, { x: -up.x, y: -up.y, z: -up.z });
    const hit = world.castRayAndGetNormal(ray, PHYS.RAY_LEN, true, undefined, undefined, undefined, body);
    if (!hit) continue;
    hits++;
    const dist = hit.timeOfImpact ?? hit.toi;
    const compVel = dot(vel, up);
    const force = Math.max(0, PHYS.STIFF * (PHYS.REST - dist) - PHYS.DAMP * compVel) * mass;
    body.applyImpulseAtPoint(scale(up, force * IDT), anchor, true);
    if (hit.normal) groundN = add(groundN, hit.normal);
  }
  const grounded = hits > 0;
  const driving = hits >= 2;
  const gN = Math.hypot(groundN.x, groundN.y, groundN.z) > 1e-4 ? norm(groundN) : { x: 0, y: 1, z: 0 };

  const fwdSpeed = dot(vel, fwd);
  const speedFrac = Math.min(1, Math.abs(fwdSpeed) / PHYS.MAX_SPEED);

  if (driving) {
    // longitudinal: eager off the line, tapered toward top speed; off-throttle
    // and braking actually slow you (ground only — air keeps all its speed).
    const vmax = PHYS.MAX_SPEED;
    let a;
    if (input.throttle > 0) {
      const taper = Math.max(0, 1 - (Math.max(0, fwdSpeed) / vmax) ** 2);
      a = PHYS.ENGINE_ACCEL * taper * input.throttle;
    } else if (input.throttle < 0) {
      if (fwdSpeed > 0.5) a = -PHYS.BRAKE_DECEL;
      else a = fwdSpeed > -PHYS.MAX_REVERSE ? -PHYS.REVERSE_ACCEL : 0;
    } else {
      a = fwdSpeed > 0.3 ? -PHYS.COAST_DECEL : (fwdSpeed < -0.3 ? PHYS.COAST_DECEL : 0);
    }
    a -= PHYS.ROLL_K * fwdSpeed; // rolling resistance
    body.applyImpulse(scale(fwd, (a * mass) / 60), true);

    // lateral grip: scrub sideways velocity
    const lat = dot(vel, right);
    body.applyImpulse(scale(right, -lat * PHYS.GRIP * mass), true);

    // steering: drive yaw rate directly, damp roll/pitch spin.
    // steer > 0 = player pressed right = clockwise from above = negative yaw.
    const av = body.angvel();
    const rate =
      -input.steer * PHYS.TURN_RATE * (1 - PHYS.TURN_FALLOFF * speedFrac) * (fwdSpeed < -0.5 ? -1 : 1);
    body.setAngvel({ x: av.x * PHYS.GROUND_SPIN_DAMP, y: rate, z: av.z * PHYS.GROUND_SPIN_DAMP }, true);

    uprightTorque(body, up, gN, PHYS.UPRIGHT, mass);
  } else {
    // AIR: no drag, no steering — heading and speed are held exactly. Holding
    // brake ("air braking") snaps the car flat. Torque-only.
    const braking = input.throttle < 0;
    const damp = braking ? PHYS.AIR_BRAKE_DAMP : PHYS.AIR_ANG_DAMP;
    const av = body.angvel();
    body.setAngvel({ x: av.x * damp, y: av.y * damp, z: av.z * damp }, true);
    uprightTorque(body, up, { x: 0, y: 1, z: 0 }, braking ? PHYS.AIR_BRAKE_LEVEL : PHYS.AIR_UPRIGHT, mass);
  }

  return { grounded, speedKmh: fwdSpeed * 3.6 };
}

function uprightTorque(body, up, target, gain, mass) {
  const axis = cross(up, target); // rotate up -> target
  const len = Math.hypot(axis.x, axis.y, axis.z);
  if (len < 1e-3) return;
  const ang = Math.asin(Math.min(1, len));
  const s = (ang * gain * mass) / (60 * len);
  body.applyTorqueImpulse({ x: axis.x * s, y: axis.y * s, z: axis.z * s }, true);
}
