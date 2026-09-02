// Headless physics check: the browser can't run the game loop in a hidden tab,
// so prove carphys.js here instead.  node sim_check.mjs
import assert from 'node:assert';
import RAPIER from './vendor/rapier.js';
import { createCarBody, stepCar } from './src/carphys.js';

await RAPIER.init();

const world = () => new RAPIER.World({ x: 0, y: -32, z: 0 });
function ground(w) {
  const b = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0));
  w.createCollider(RAPIER.ColliderDesc.cuboid(200, 1, 2000).setFriction(1), b);
}
function step(w, body, input, n) {
  for (let i = 0; i < n; i++) {
    stepCar(RAPIER, w, body, input);
    w.step();
  }
}
const hspeed = (b) => Math.hypot(b.linvel().x, b.linvel().z);

// --- 1. drive forward: reaches speed, stays on the ground, tapers (not instant) ---
{
  const w = world();
  ground(w);
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 0.6, z: 0 }, true);

  step(w, car, { throttle: 1, steer: 0 }, 90); // 1.5s
  const early = hspeed(car);
  step(w, car, { throttle: 1, steer: 0 }, 510); // to ~10s total
  const t = car.translation();
  const top = hspeed(car);
  console.log(`drive:  1.5s=${early.toFixed(1)}  10s=${top.toFixed(1)} m/s   pos=(${t.x.toFixed(1)}, ${t.y.toFixed(2)}, ${t.z.toFixed(0)})`);
  assert(early < 45, `accel should taper, not be instant — 1.5s speed ${early.toFixed(1)}`);
  assert(top > 70 && top <= 116, `top speed should settle near MAX_SPEED, got ${top.toFixed(1)}`);
  assert(Math.abs(t.x) < 4 && t.y > -0.5 && t.y < 3, `should track straight on the ground`);
}

// --- 2. coast: lift off the throttle on the ground and you slow down ---
{
  const w = world();
  ground(w);
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 0.6, z: 0 }, true);
  step(w, car, { throttle: 1, steer: 0 }, 300); // 5s under power
  const v0 = hspeed(car);
  step(w, car, { throttle: 0, steer: 0 }, 180); // 3s coasting
  const v1 = hspeed(car);
  console.log(`coast:  ${v0.toFixed(1)} -> ${v1.toFixed(1)} m/s over 3s off-throttle`);
  assert(v0 - v1 > 12, `coasting should bleed speed, only lost ${(v0 - v1).toFixed(1)}`);
  assert(v1 > 0, `should still be rolling, not reversed`);
}

// --- 3. air: no drag, horizontal speed preserved exactly (rule #1) ---
{
  const w = world();
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 50, z: 0 }, true);
  car.setLinvel({ x: 0, y: 0, z: 60 }, true);
  const before = hspeed(car);
  step(w, car, { throttle: 0, steer: 0 }, 60);
  const lv = car.linvel();
  console.log(`air:    horiz ${before.toFixed(2)} -> ${hspeed(car).toFixed(2)} m/s   vy=${lv.y.toFixed(1)}`);
  assert(Math.abs(hspeed(car) - before) < 0.5, `air drag detected`);
  assert(lv.y < -25, `gravity should pull down`);
}

// --- 4. no steering in the air: heading is held ---
{
  const w = world();
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 50, z: 0 }, true);
  car.setLinvel({ x: 0, y: 0, z: 60 }, true);
  step(w, car, { throttle: 0, steer: 1 }, 60); // hold right in the air
  const q = car.rotation();
  const yaw = Math.abs(2 * Math.asin(Math.max(-1, Math.min(1, q.y))));
  const spin = Math.abs(car.angvel().y);
  console.log(`airturn: yaw=${yaw.toFixed(3)} rad  yawRate=${spin.toFixed(3)} (both ~0)`);
  assert(yaw < 0.08 && spin < 0.3, `car should not turn in the air: yaw=${yaw.toFixed(3)}`);
}

// --- 5. ground steering still works: press right -> car goes right (-x) ---
{
  const w = world();
  ground(w);
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 0.6, z: 0 }, true);
  step(w, car, { throttle: 1, steer: 0 }, 90);
  step(w, car, { throttle: 1, steer: 1 }, 120);
  const t = car.translation();
  console.log(`steer:  held right -> x=${t.x.toFixed(1)} (want negative)`);
  assert(t.x < -3, `right steer should move -x, got x=${t.x.toFixed(1)}`);
}

// --- 6. air braking: levels a tilted car, does NOT slow it (rule #1) ---
{
  const w = world();
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 50, z: 0 }, true);
  car.setLinvel({ x: 0, y: 0, z: 60 }, true);
  car.setRotation({ x: -0.38268, y: 0, z: 0, w: 0.92388 }, true); // -45deg pitch
  const h0 = hspeed(car);
  step(w, car, { throttle: -1, steer: 0 }, 45);
  const pitch = Math.abs(2 * Math.asin(Math.max(-1, Math.min(1, car.rotation().x))));
  console.log(`airbrk: pitch 0.79 -> ${pitch.toFixed(2)} rad   horiz ${h0.toFixed(1)} -> ${hspeed(car).toFixed(1)}`);
  assert(pitch < 0.4, `air brake should flatten the car`);
  assert(Math.abs(hspeed(car) - h0) < 0.5, `air brake must not slow the car`);
}

console.log('\nphysics ok');
