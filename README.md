# wedge racer

Single-player low-poly time-trial. PolyTrack-ish car, Trackmania-ish air.
No checkpoints, no backend, no runtime network calls — three.js and the physics
engine are vendored, tracks are ES modules. Runs from any static host **and**
straight off disk (`file://`), which is the point: locked-down school machines.

PB + ghost live in the browser's `localStorage` (per machine, per browser).

## run

```
./serve.sh            # static server on :8171 (needs python3)
open http://localhost:8171
```

Or just open `index.html` off a USB stick — no server needed.

Drive with arrows / WASD. `R` or `T` restarts. Timer starts on first input,
stops at the green finish gate. Your best run replays as a blue ghost with a
live +/- split. In the air, hold brake (down / S) to level out ("air braking").

Pick a track with `?track=01-warmup` (defaults to that).

## checks

```
node test.mjs         # validates every track module
node sim_check.mjs     # headless physics: drive, steer, no air drag, air-brake
```

## add a track

Make `tracks/NN-name.js` with `export default { ... }`, then import it in
`tracks/all.js`. Blocks snap to an 8m grid (`cell: [x, y, z]`, `y` in 4m
elevation steps), `yaw` in degrees. Types: `straight`, `ramp` (rises one step
over the cell), `curve_l`, `curve_r`, `gap` (no collider — the jump). `start`
and `finish` are `{cell, yaw}`. Run `node test.mjs`.

## tuning

All physics constants: `src/config.js`. The car model: `src/carphys.js`.
Players can't change any of it in-game, by design.

## not done yet

- track select menu (URL param only)
- only one track authored
- `curve_l/r` are flat pads, not proper banked curve meshes
- tab away = timer pauses (hidden tabs can't run the loop); returning resumes
