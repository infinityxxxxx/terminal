# wedge racer

Single-player low-poly time-trial. PolyTrack-ish car, Trackmania-ish air.
No checkpoints, no backend — PB + ghost live in `localStorage`.

## run

```
./serve.sh            # static server on :8171 (needs python3)
open http://localhost:8171
```

Drive with arrows / WASD. `R` restarts. Timer starts on first input, stops at
the green finish gate. Your best run is saved and replayed as a blue ghost with
a live +/- split.

Pick a track with `?track=01-warmup` (defaults to that).

## checks

```
node test.mjs         # validates every tracks/*.json
node sim_check.mjs     # headless physics: forward drive + no air drag
```

## add a track

Drop a JSON in `tracks/`. Blocks snap to an 8m grid (`cell: [x, y, z]`,
`y` in 4m elevation steps), `yaw` in degrees. Types: `straight`, `ramp`
(rises one step over the cell), `curve_l`, `curve_r`, `gap` (no collider —
the jump). `start` and `finish` are `{cell, yaw}`. Run `node test.mjs`.

## tuning

All physics constants: `src/config.js`. The car model: `src/carphys.js`.
Players can't change any of it in-game, by design.

## controls

arrows / WASD to drive, `R` or `T` to restart. In the air, hold brake
(down / S) to level the car out ("air braking").

## not done yet

- track select menu (URL param only)
- only one track authored
- `curve_l/r` are flat pads, not proper banked curve meshes
- tab away = timer pauses (hidden tabs can't run the loop); returning resumes
