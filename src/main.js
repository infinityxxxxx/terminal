import * as THREE from 'three';
import RAPIER from 'rapier';
import { FIXED_DT, PHYS } from './config.js';
import { buildTrack } from './track.js';
import { Car, setRapier } from './car.js';
import { Recorder, Ghost, loadPB, savePB } from './ghost.js';
import { hud } from './hud.js';
import { TRACKS, DEFAULT_TRACK } from '../tracks/all.js';

const wanted = new URLSearchParams(location.search).get('track');
const json = TRACKS[wanted] || TRACKS[DEFAULT_TRACK];

await RAPIER.init();
setRapier(RAPIER);

// --- renderer / scene ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc7e8);
scene.fog = new THREE.Fog(0x8fc7e8, 60, 320);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);

const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(40, 80, 20);
sun.castShadow = true;
sun.shadow.camera.left = sun.shadow.camera.bottom = -120;
sun.shadow.camera.right = sun.shadow.camera.top = 120;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun, new THREE.HemisphereLight(0xbfe3ff, 0x6b5a44, 1.0));

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- world / track / car ---
const world = new RAPIER.World({ x: 0, y: PHYS.GRAVITY, z: 0 });
const track = buildTrack(scene, world, json);
const car = new Car(scene, world, track.start);

let pb = loadPB(track.name);
const rec = new Recorder();
let ghost = new Ghost(scene, pb);
hud.pb(pb?.time ?? null);

// --- input ---
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'KeyR' || e.code === 'KeyT') restart(); // PolyTrack uses both
});
addEventListener('keyup', (e) => keys.delete(e.code));
function readInput() {
  const up = keys.has('ArrowUp') || keys.has('KeyW');
  const down = keys.has('ArrowDown') || keys.has('KeyS');
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const rightK = keys.has('ArrowRight') || keys.has('KeyD');
  return { throttle: (up ? 1 : 0) - (down ? 1 : 0), steer: (rightK ? 1 : 0) - (left ? 1 : 0) };
}

// --- race state ---
let state = 'ready'; // ready -> running -> finished
let elapsed = 0;
let finishSide = 0;

function restart() {
  car.respawn(track.start);
  car.freeze();
  rec.reset();
  ghost.reset();
  state = 'ready';
  elapsed = 0;
  finishSide = signToFinish();
  hud.time(0);
  hud.split(null);
  hud.msg('accelerate to start &nbsp;·&nbsp; <b>R</b> restart');
}

function signToFinish() {
  const t = car.body.translation();
  return Math.sign(new THREE.Vector3(t.x, t.y, t.z).sub(track.finish.point).dot(track.finish.normal)) || -1;
}

function checkFinish() {
  const t = car.body.translation();
  const rel = new THREE.Vector3(t.x, t.y, t.z).sub(track.finish.point);
  if (Math.abs(rel.x) > track.finish.half && Math.abs(rel.z) > track.finish.half) return false;
  const side = Math.sign(rel.dot(track.finish.normal)) || finishSide;
  const crossed = finishSide < 0 && side >= 0;
  finishSide = side;
  return crossed;
}

function finish() {
  state = 'finished';
  const isPB = savePB(track.name, elapsed, rec.frames.slice());
  if (isPB) { pb = loadPB(track.name); hud.pb(pb.time); }
  hud.msg(`FINISH &nbsp; <b>${elapsed.toFixed(3)}s</b>${isPB ? ' &nbsp;— NEW PB!' : ''}<br><span style="font-size:14px">press <b>R</b></span>`);
}

restart();

// --- fixed-step loop ---
const camPos = new THREE.Vector3();
const camAim = new THREE.Vector3();
let last = performance.now();
let acc = 0;

function step() {
  const input = readInput();

  if (state === 'ready' && (input.throttle > 0 || input.steer !== 0)) {
    state = 'running';
    elapsed = 0;
    rec.reset();
    ghost.reset();
    car.unfreeze();
    hud.msg('');
  }

  if (state !== 'ready') car.control(input);
  world.step();
  car.syncMesh();

  if (state === 'running') {
    elapsed += FIXED_DT;
    rec.push(car.pose);
    const t = car.body.translation();
    const carPos = new THREE.Vector3(t.x, t.y, t.z);
    ghost.showAt(rec.count);
    hud.split(ghost.split(carPos, elapsed));
    hud.time(elapsed);
    if (checkFinish() && rec.count > 30) finish(); // >0.5s guards a spawn-frame glitch
  }
  hud.speed(car.speedKmh);
}

function updateCamera(dt) {
  const t = car.body.translation();
  const r = car.body.rotation();
  const q = new THREE.Quaternion(r.x, r.y, r.z, r.w);
  // yaw only, so the camera doesn't roll with the car
  const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x));
  const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const want = new THREE.Vector3(t.x, t.y, t.z).addScaledVector(back, -8).add(new THREE.Vector3(0, 3.5, 0));
  camPos.lerp(want, 1 - Math.pow(0.001, dt));
  camAim.lerp(new THREE.Vector3(t.x, t.y + 1, t.z), 1 - Math.pow(0.0001, dt));
  camera.position.copy(camPos);
  camera.lookAt(camAim);
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  let guard = 8;
  while (acc >= FIXED_DT && guard--) {
    step();
    acc -= FIXED_DT;
  }
  updateCamera(dt);
  renderer.render(scene, camera);
}
camPos.copy(camera.position.set(track.start.pos.x, track.start.pos.y + 4, track.start.pos.z - 8));
requestAnimationFrame(frame);
