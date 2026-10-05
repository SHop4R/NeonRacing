# Faster traffic, fuel nitro, and crash recovery

This revision supersedes the previous single-charge/full-meter-only nitro behavior and conservative opening pace. The neon identity, fixed-axis camera, planar underglow, shield health, repair pickups, near misses, multiplier, and day/night cycle are preserved.

## Central tuning

All values are in `src/tuning.js`.

| System | Values |
| --- | --- |
| Cruise | 62 → 80 m/s (223 → 288 km/h), smoothstep over 150 active seconds |
| Traffic | 24 m/s (86 km/h); occupied-lane probability 72% → 93%; reserve at least one lane, two every third row |
| Traffic waves | 1.8 → 1.2 s timer plus 106.56 m minimum row spacing; spawn 230 m ahead |
| Safety | 2.57 s initial reaction at maximum boosted closing speed; 1.1 s escape allowance + 8 m clearance; maximum-speed cross-road maneuver tested |
| Lane changes | 1.35 s directional signal; 1.125–1.375 s eased crossing; randomized 2.4–4.5 s decision interval; one maneuver at a time |
| Lane clearance | 24 m longitudinal exclusion; reserve a stationary escape lane across source and destination; cancel warning when destination becomes unsafe or vehicle gets within 60 m |
| Brake | Target 36 m/s (130 km/h), response 5/s, recovery acceleration response 2.6/s |
| Nitro fuel | Empty start; 30 s recharge; 10 s full drain; 0.75 s recharge delay; 1.42× speed target |
| Full bonuses | Shield + magnet for at most 10 s from activation; stop immediately on cancellation/depletion/crash |
| Orbs | Fill to 100%; 14% per eligible wave, 12 s spawn cooldown, at most one uncollected |
| Crash | 34 damage; 0.85 s animation; slowdown target 14 m/s; respawn at 32 m/s (115 km/h) |
| Recovery | 2.2 s protection; clear hazards from 22 m behind to 125 m ahead |
| Body/glow | Brake pitch up to 0.055 rad; crash yaw up to 0.32 rad; glow remains at Y=0.04, independent of pitch/roll |
| Effects | Two 36-sample rear ribbons, 0.42 s lifetime; four flame meshes; 44 peripheral streaks; 96 pooled particles; exponential 16/s onset, 7/s fade |
| Signs | Four gantries, 105 m spacing, recycle only 20 m behind the camera |

## Controls and decisions

- A/D or arrows steer. S/Down or hold BRAKE slows the car and cancels boost.
- Space/Shift, the clickable desktop meter, and touch NITRO share input handling. Partial fuel works while held. Releasing stops it.
- Starting at 100% latches automatic boost with shield and magnet. Initial release does nothing; a fresh press or brake cancels. After cancellation or depletion, release before re-arming.
- Orbs refill fuel without changing the activation mode or extending the original bonus deadline. An automatic boost may continue on refilled fuel after its bonuses expire; the HUD explicitly says the bonuses expired.
- Pause freezes gameplay timers and effect lifetimes. Restart resets fuel, bonuses, crashes, traffic, and effects. Respawn clears trail history so teleporting cannot draw a ribbon across the road.
- Crash animation affects only the visual body. The collider and camera remain stable. The moving world keeps player Z at zero, with camera X/Y and look-target X fixed.

## Verification

Automated checks cover exact fuel timing, partial/full activation, release and fresh cancellation, brake priority, orb semantics, bonus deadline, keyboard repeat, independent pointer lifecycles, pause/restart, crash/respawn, shield hits, one-hit gating, lane warning/motion/clearance, reserved routes, a four-minute traffic stress run, maximum-speed escape, sign lifecycle, bounded/reset/frozen effects, planar glow, brake lights/pitch, and fixed-axis camera framing.

`tests/browser-lab.html` exercises the actual app, rendering, and input wiring. Its optional autopilot controls steering only; it does not alter collision rules or grant protection. It is development-only and excluded from the production build. Final verification: 43/43 automated tests pass; production build and whitespace checks pass. Independent review found no blocking issues.

Live browser checks covered 1440×900, 390×844, 320×568, and 844×390. The sustained steering-only autopilot run lasted 158.6 active seconds, reached the capped 288 km/h cruise, observed 28 signals / 25 completed lane changes, and retained 100 shield without respawning. Additional controlled runs verified partial hold/release, desktop mouse and touch full activation, fresh cancellation, brake override, orb refill, visible impact particles/body jolt, shield absorption, safe recovery, and flat underglow. A paused automatic boost retained exactly the same fuel, bonus time, and trail samples across inspection.

No captured browser errors or horizontal overflow. Touch targets measured at least 61×60 px on the narrow portrait layout and 71×56 px in landscape. The local browser's frame counter averaged about 120 FPS across the sustained run; this is a local desktop measurement, not a physical-phone benchmark. Screenshots: `nitro-desktop.jpg` and `nitro-mobile.jpg`.

Limitations: physical mobile hardware and real multi-finger input have not been tested; pointer lifecycle behavior is covered by integration tests. The build retains a nonblocking Three.js vendor chunk advisory (514 kB, 131 kB gzip).
