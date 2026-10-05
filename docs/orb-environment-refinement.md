# Orb, environment, and nitro feedback refinement

This revision builds on `driving-refinement.md`; values below supersede its earlier signal timing and recovery visuals. Existing hold/automatic nitro controls, braking priority, traffic safety rules, fuel timing, safe respawn, and fixed-axis camera are retained.

## Tuning

- Base pickup: original 3 m lane plus the car's 1.05 m half-width, yielding a 2.55 m center-overlap threshold. Longitudinal reach is 2.5 m, swept across each frame. Magnet attraction and physical magnet collection remain separate.
- Pickups travel at 32 m/s in world coordinates. While braking behind a nearby same-lane leader, pickups ease toward 8 m/s below its speed (16 m/s for ordinary traffic), allowing them to drift back over that vehicle to the waiting player. Brake following settles around a 16 m gap; releasing restores normal acceleration. Queue range is 50 m. Pickups expire after 50 seconds, beyond 300 m ahead, or 30 m behind.
- Buildings sit on ground at Y=-0.36 with contact shading. Ground spans 4,000 m. Near/middle/far motion factors are 1 / 0.36 / 0.10. Ninety-six buildings fill evenly spaced rows throughout a 600 m recycling span; recycling occurs 120 m behind the camera.
- The pink leak came from glossy ground and roadbed receiving magenta light. Continuous matte ground, matte roadbed/barriers, and restrained magenta fill eliminate the broad reflective patch while preserving neon trim.
- Amber signals flash at 1.25 Hz with equal on/off intervals, starting 2.4 seconds before a roughly 1.25-second crossing. Signals continue through the crossing.
- Full-nitro shield: complete sphere geometry, radius 2.05 m, uniform scale, centered independently of visual body pitch/roll. Soft rim shading replaces orbital motion. Only active full-nitro bonuses show it.
- Recovery: 2.2 seconds of car/underglow blinking at 2.5 Hz, 60% visible duty, with no shield sphere.
- Partial effects intensity: 0.55. Full mode: 1.0 plus a 0.6-second activation burst. Mode remains based on activation, even after fuel drops or an orb refills it.

## Actual reference inspected

Retrieved the current [SpaceAttack Nova UI](https://github.com/SHop4R/SpaceAttack/blob/main/src/nova-ui.mjs) and [styles](https://github.com/SHop4R/SpaceAttack/blob/main/styles.css) directly from GitHub. Adapted its 500 ms readiness jump, pixel burst, segmented charge track, continuous ready pulse, and glowing border. Neon Racing uses an 8 px jump, 18 ready sparks, 24 full-activation sparks, and a 1.01–1.04 ready scale to fit narrow screens. Readiness celebrates once per transition; pause and restart retain/reset the appropriate animation state.

## Verification

58 automated tests pass. Production build and whitespace checks pass. Independent review approved the gameplay changes and final city distribution.

The real browser fixture verified lane-edge collection with car center X=-1.04 and orb lane X=1.5. The exact blocked-orb case began with traffic 30 m ahead and an orb 35 m ahead in the same lane. Braking from normal starting speed collected the orb in 2.8 seconds with 100 shield, no respawn, and the traffic still 16.4 m ahead: no ramming or overtaking.

Visual checks covered 1440×900, 1920×800, 390×844, and 2560×720. Verified grounded buildings and no right-side pink patch, parallax, directional signals, normal/full effects, spherical shield during steering, brake cancellation, recovery blinking without a sphere, and fixed camera X/Y. The final 25-second ultrawide run retained 100 shield, collected 10 pickups, and observed two completed signaled lane changes. No captured browser errors or mobile horizontal overflow. Local frame measurement was approximately 118–120 FPS; this is not a physical-phone benchmark.

Screenshots: `refinement-full-nitro.png`, `refinement-mobile.png`, `refinement-ultrawide.png`.

Limitations: physical mobile hardware/multi-finger play has not been tested. The build retains a nonblocking Three.js vendor-size advisory (516 kB, 131 kB gzip).
