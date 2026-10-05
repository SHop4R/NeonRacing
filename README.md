# Neon Racing — Midnight Overdrive

A browser-based 3D endless highway racer built with Three.js. Procedural cars, illuminated city towers, neon gantries, bloom, engine audio, and a gradual night-to-day ambience cycle. All game assets are generated locally; there are no remote fonts, textures, or model downloads at runtime.

## Run locally

Requires Node.js 22.12+.

```sh
npm install
npm run dev
```

Open the local address shown in the terminal. For a production build:

```sh
npm run build
npm run preview
```

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Steer | A / D or left / right arrows | Hold the left / right buttons |
| Brake | Hold S / Down Arrow | Hold BRAKE |
| Nitro | Hold Space / Shift or the nitro meter | Hold NITRO |
| Pause / resume | P, Escape, or pause button | Pause button |
| Retry after game over | R or retry button | Retry button |
| Sound | Music-note button | Music-note button |

Forward motion is automatic. The game pauses and clears held controls when focus is lost. Sound starts muted and can be enabled with the music-note button.

## How to play

- Dodge traffic. Unshielded hits cost 34 shield and trigger a 0.85-second impact sequence. The road holds at the impact point during the brief crash animation. You respawn at that exact lateral position at 115 km/h with 2.2 seconds of blinking recovery protection and nearby hazards cleared. Three unrepaired hits end the run.
- Collect pink repair crosses to restore 25 shield, up to 100.
- Nitro starts empty. Passive fuel refill takes 30 active seconds, pauses during boosts, and resumes 0.75 seconds after a boost ends.
- Hold nitro with any fuel to boost at 1.42× cruise speed. Partial starts drain a full tank over 10 seconds and provide speed/effects only: release to stop.
- Start at 100% for automatic boost with shield and pickup magnet. The first release keeps it running; press again or brake to cancel. Automatic boost, shield, and magnet end together after 7 seconds, even if you collect more fuel. During automatic boost the meter shows the remaining boost window.
- Cyan orbs refill fuel to 100% without upgrading an existing partial boost. They have a 14% chance per eligible encounter, a 12-second spawn cooldown, and at most one uncollected orb on the road.
- Hold brake to slow smoothly toward 55 km/h while steering; behind traffic it can slow further for a safe following gap. Brake always overrides boost. Release to accelerate back to cruise.
- Pickups collect across their original lane whenever the car overlaps it, within a 2.5 m longitudinal window. They are stationary road objects: their approach speed is exactly your world speed. Braking gives more time; magnet attraction is separate.
- Full nitro has a centered spherical shield, stronger flames/trails, and a short activation burst. Recovery protection uses blinking only.
- Gold energy pickups award 100 points before your multiplier.
- Pass close without touching to earn a 200-point near miss and build your combo faster.
- Clean driving increases your score multiplier from x1 to x5. Taking damage resets it.
- Cruise starts at 223 km/h and ramps smoothly to 288 km/h over 8 km. Encounter spacing decreases from 150 m to 65 m. Vehicles have individual speeds and keep safe following gaps.
- The two right lanes travel with you; the two left lanes carry oncoming traffic. The double amber center line is crossable. Driving in the left lanes earns 2× forward-driving score, multiplied by your existing combo.
- Oncoming cars approach at the sum of your speeds and briefly flash their white headlights when you are in their path. Same-direction closing speed is the difference of your speeds.
- Traffic appears at least 320 m ahead and farther when closing speed requires it; spawn checks reserve escape opportunities. Maximum population is 48 vehicles.
- Vehicles signal at 1.25 Hz for 2.4 seconds before smoothly moving to the neighboring lane in their own direction. Crossing takes 1.3–2.6 seconds according to vehicle class. Traffic predicts destination clearance; only one lane change is active at a time.
- The sky and city lighting cycle through night, dawn, and day over 90 seconds.
- Your best score is saved in browser storage when available.

## Validation

```sh
npm test
npm run build
```

Node tests cover crashes and recovery protection, repair/nitro caps, boost duration and protection, pickup attraction, near-miss scoring and collision-window regressions, road bounds, restart, pause, multiplier growth, game over, and independent keyboard/pointer controls.

WebGL2 and hardware acceleration are required. Rendering resolution is capped at 1.5× pixel density. This is a single-player arcade simulation, not a physics simulator.

## Code layout

- `src/tuning.js`: centralized driving, nitro, and difficulty settings.
- `src/simulation.js`: gameplay, scoring, spawning, and crash recovery.
- `src/nitro.js`: fuel, hold/automatic modes, and timed bonuses.
- `src/traffic.js`: collision-aware signaled lane changes.
- `src/scene-effects.js`: pooled impact particles, world-space trails, and exhaust flames.
- `src/road-motion.js`: pass-under sign lifecycle.
- `src/scene.js`: procedural 3D scene, chase camera, lighting, and effects.
- `src/vehicle-motion.js`: independent body motion, planar glow hierarchy, and fixed-axis camera framing.
- `src/hud.js`: nitro presentation and one-shot ready animation.
- `src/input.js`: keyboard and multi-pointer controls.
- `src/main.js`: game loop, HUD, menus, and best-score storage.
- `src/audio.js`: optional synthesized engine and game sounds.

## Refinement validation

The test suite includes 30-second recharge and 10-second drain simulations, a four-minute traffic stress run, a worst-case full-road escape at maximum boost speed, held-key and multi-pointer lifecycle checks, bounded/frozen/reset effect checks, glow world-coordinate assertions, and camera orientation/framing tests. `tests/browser-lab.html` is a development-only fixture that exercises the real app and renderer with repeatable inputs; it is not included in the production build.

HUD reference: the actual [SpaceAttack styles](https://github.com/SHop4R/SpaceAttack/blob/main/styles.css), [Nova UI](https://github.com/SHop4R/SpaceAttack/blob/main/src/nova-ui.mjs), and [feedback implementation](https://github.com/SHop4R/SpaceAttack/blob/main/src/effects.mjs) were inspected through GitHub. Larger numeric anchors, a distinct readiness edge, and screen-space meter animation inspired this revision; Neon Racing retains its own typography and neon palette.

Latest environment, pickup, and feedback verification: [refinement notes](docs/orb-environment-refinement.md).

## Traffic classes

Cruising ranges are bounded; vehicles can slow below them when following traffic.

| Class | Cruise km/h | Width × length (m) |
| --- | --- | --- |
| Truck | 65–86 | 2.35 × 7.4 |
| Van | 79–104 | 2.05 × 5.1 |
| Pickup | 90–119 | 2.05 × 4.8 |
| Sedan | 97–130 | 1.85 × 4.4 |
| Hatchback | 108–140 | 1.75 × 3.5 |
| Motorcycle | 151–187 | 0.75 × 2.25 |

Latest movement and difficulty values supersede the earlier refinement notes. See [two-way traffic verification](docs/two-way-traffic.md).

Latest motorcycle, braking, nitro, collider, and respawn tuning: [driving polish verification](docs/driving-polish.md).

Latest subtle collision forgiveness, natural nitro-expiry grace, and far-distance orb visibility: [tuning and verification](docs/collision-forgiveness.md).

Arcade score feedback, licensed display font, nitro-ready motion, and traffic-priority orb rendering: [feedback verification](docs/arcade-feedback.md).

Unified vehicle messages and the complete typography system: [verification notes](docs/unified-feedback.md).

Compact statuses, independent pickup gains, and restored oncoming indicators: [verification notes](docs/pickup-status-feedback.md).

Shield expiry warning and quieter HUD hierarchy: [verification notes](docs/shield-hud-clarity.md).

Car-showcase menu, engine startup, first-play tutorial and banked nitro pickups: [behavior and verification](docs/menu-nitro-reserve.md).

Barrier impacts, stable contact and protection handling: [verification notes](docs/barrier-damage.md).

Complete menu surroundings, the Nightjar player car and measured rendering/pool improvements: [verification notes](docs/environment-hero-reuse.md).
