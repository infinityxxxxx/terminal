// Headless physics check: the browser can't run the game loop in a hidden tab,
// so prove carphys.js here instead.
//   node sim_check.mjs
// Asserts: (1) throttle drives forward and stays on the ground,
//          (2) in the air, horizontal speed is preserved exactly (rule #1).
import assert from 'node:assert';
import RAPIER from './vendor/rapier.js';
import { createCarBody, stepCar } from './src/carphys.js';

await RAPIER.init();

function world() {
  return new RAPIER.World({ x: 0, y: -32, z: 0 });
}
function ground(w) {
  const b = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0));
  w.createCollider(RAPIER.ColliderDesc.cuboid(200, 1, 400).setFriction(1), b);
}
function step(w, body, input, n) {
  for (let i = 0; i < n; i++) {
    stepCar(RAPIER, w, body, input);
    w.step();
  }
}

// --- 1. drive forward on flat ground ---
{
  const w = world();
  ground(w);
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 0.6, z: 0 }, true);
  step(w, car, { throttle: 1, steer: 0 }, 300); // 5s

  const t = car.translation();
  const v = car.linvel();
  const speed = Math.hypot(v.x, v.z);
  console.log(`drive:  pos=(${t.x.toFixed(1)}, ${t.y.toFixed(2)}, ${t.z.toFixed(1)})  speed=${speed.toFixed(1)} m/s`);
  assert(t.z > 60, `expected to travel >60m forward, got ${t.z.toFixed(1)}`);
  assert(Math.abs(t.x) < 4, `expected to stay straight, drifted x=${t.x.toFixed(1)}`);
  assert(t.y > -0.5 && t.y < 3, `expected to stay on the ground, y=${t.y.toFixed(2)}`);
  assert(speed > 25, `expected real speed, got ${speed.toFixed(1)}`);
}

// --- 2. air: no drag, horizontal speed preserved (rule #1) ---
{
  const w = world();
  // no ground under the car -> all wheels miss -> AIR branch
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 50, z: 0 }, true);
  car.setLinvel({ x: 0, y: 0, z: 60 }, true); // launched at 60 m/s

  const before = Math.hypot(car.linvel().x, car.linvel().z);
  step(w, car, { throttle: 0, steer: 0 }, 60); // 1s of flight
  const lv = car.linvel();
  const after = Math.hypot(lv.x, lv.z);
  console.log(`air:    horiz speed ${before.toFixed(2)} -> ${after.toFixed(2)} m/s   vy=${lv.y.toFixed(1)} (gravity only)`);
  assert(Math.abs(after - before) < 0.5, `air drag detected: ${before.toFixed(2)} -> ${after.toFixed(2)}`);
  assert(lv.y < -25, `expected gravity to pull down, vy=${lv.y.toFixed(1)}`);
}

// --- 3. steering: press right -> car goes right (-x) ---
{
  const w = world();
  ground(w);
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 0.6, z: 0 }, true);
  step(w, car, { throttle: 1, steer: 0 }, 60);  // get rolling
  step(w, car, { throttle: 1, steer: 1 }, 90);  // then hold right
  const t = car.translation();
  console.log(`steer:  held right -> x=${t.x.toFixed(1)} (want negative), z=${t.z.toFixed(1)}`);
  assert(t.x < -3, `right steer should move -x, got x=${t.x.toFixed(1)}`);
}

// --- 4. air braking: levels a tilted car, does NOT slow it (rule #1) ---
{
  const w = world();
  const car = createCarBody(RAPIER, w);
  car.setTranslation({ x: 0, y: 50, z: 0 }, true);
  car.setLinvel({ x: 0, y: 0, z: 60 }, true);
  const a = 0.38268, cw = 0.92388; // -45deg pitch about X
  car.setRotation({ x: -a, y: 0, z: 0, w: cw }, true);
  const h0 = Math.hypot(car.linvel().x, car.linvel().z);
  step(w, car, { throttle: -1, steer: 0 }, 45);
  const r = car.rotation();
  const pitch = Math.abs(2 * Math.asin(Math.max(-1, Math.min(1, r.x))));
  const h1 = Math.hypot(car.linvel().x, car.linvel().z);
  console.log(`airbrk: pitch 0.79 -> ${pitch.toFixed(2)} rad   horiz speed ${h0.toFixed(1)} -> ${h1.toFixed(1)}`);
  assert(pitch < 0.4, `air brake should flatten the car, pitch=${pitch.toFixed(2)}`);
  assert(Math.abs(h1 - h0) < 0.5, `air brake must not slow the car: ${h0.toFixed(1)} -> ${h1.toFixed(1)}`);
}

console.log('\nphysics ok');
