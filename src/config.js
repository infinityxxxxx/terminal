// All game + physics constants. NOT exposed to the player anywhere in the UI:
// a PolyTrack player should get one consistent car, not a tuning sandbox.
// Tune here, reload. Units are metres / seconds unless noted.

export const FIXED_DT = 1 / 60;

export const PHYS = {
  GRAVITY: -32,

  // engine / speed
  ENGINE_ACCEL: 40,      // forward accel on the ground (m/s^2)
  BRAKE_ACCEL: 70,
  REVERSE_ACCEL: 18,
  MAX_SPEED: 115,        // ~415 "km/h" on the HUD
  MAX_REVERSE: 22,

  // steering (ground)
  TURN_RATE: 2.5,        // rad/s at low speed
  TURN_FALLOFF: 0.55,    // fraction of TURN_RATE lost at MAX_SPEED
  GRIP: 0.35,            // fraction of sideways speed scrubbed per step (0 ice, 1 rails)
  GROUND_SPIN_DAMP: 0.82,// kills roll/pitch spin while grounded

  // suspension (per wheel)
  RAY_LEN: 0.6,
  REST: 0.35,
  STIFF: 130,
  DAMP: 12,

  // air. THE KEY RULE: no drag, no slowdown. Momentum is kept exactly.
  // Only these tiny assists act, so you land rubber-side down and can nudge
  // the nose (Trackmania-ish air control) without scrubbing speed.
  AIR_ANG_DAMP: 0.985,   // per step, bleeds wild tumbling only
  AIR_CONTROL: 2.2,      // rad/s of nose authority from steering in the air
  AIR_UPRIGHT: 1.4,      // gentle passive auto-level toward world up
  // "air braking": hold brake in the air to snap the car flat. Torque only,
  // so horizontal speed is untouched (rule #1 still holds).
  AIR_BRAKE_LEVEL: 9,
  AIR_BRAKE_DAMP: 0.85,

  // keep the car pointing out of the track surface
  UPRIGHT: 9,
};

export const CAR = {
  // wheel anchors in car-local space (x right, y up, z forward). Four corners,
  // PolyTrack-style low-poly car.
  WHEELS: [
    [-0.56, -0.18, 0.62],  // front left
    [0.56, -0.18, 0.62],   // front right
    [-0.56, -0.18, -0.66], // rear left
    [0.56, -0.18, -0.66],  // rear right
  ],
  HALF: [0.55, 0.26, 1.0], // collider half-extents
  DENSITY: 0.9,            // -> mass ~1.2
};

// grid: blocks snap to CELL on x/z, CELL_Y per elevation step.
export const GRID = { CELL: 8, CELL_Y: 4 };

// every block type track JSON is allowed to reference. Shared with test.mjs
// so a typo in a track file fails the check instead of the game.
export const BLOCK_TYPES = new Set(['straight', 'ramp', 'curve_l', 'curve_r', 'gap']);
