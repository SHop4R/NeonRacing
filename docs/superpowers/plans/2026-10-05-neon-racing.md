# Neon Racing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver the approved browser-based 3D neon highway racer, including desktop and touch play.

**Architecture:** A deterministic simulation emits gameplay events; Three.js renders its state and a DOM HUD displays it. Input merges keyboard and independent pointer states; application wiring manages menus, sound, persistence, and a fixed simulation timestep.

**Tech Stack:** JavaScript ES modules, Three.js, Vite, Node test runner.

**Spec:** docs/game-design.md

## Global Constraints
- Four-lane elevated highway; continuous steering and automatic forward motion.
- Shield 100; collisions remove 34; repairs add 25 capped at 100.
- Nitro starts with one charge, capacity three, duration 2.5 seconds, with invincibility and pickup attraction.
- Energy pickups award 100 base points; near misses award 200 base points once per car.
- Multiplier grows from x1 to x5 and resets on damage.
- Ambience completes a 90-second cycle.
- Desktop A/D or arrows, Space/Shift boost, P/Escape pause, R retry; simultaneous touch steering and boost.
- Local dependency bundle; no externally loaded art assets; capped rendering resolution.

## Review Focus
- Focus loss while keys or pointers are held must clear input and pause.
- Fast movement must not tunnel through traffic or pickups.
- A car hit during invincibility must never later award a near miss.
- Unavailable storage or audio must not stop the game.
- Narrow mobile screens must keep controls reachable and HUD readable.

### Task 1: Simulation and mechanics
Files: package.json, src/simulation.js, tests/simulation.test.js.
Interfaces: createGame(random), startGame(state), activateBoost(state), stepGame(state, input, dt), returning state with entities and event queue.
- [x] Write deterministic tests for damage, cooldown, repair clamping, nitro duration/capacity/magnet, near-miss uniqueness, scoring, bounds, and restart.
- [x] Run `npm test` and confirm absent simulation fails.
- [x] Implement bounded traffic generation with an open lane, swept collision checks, fixed-step movement, state transitions, and gameplay events.
- [x] Run `npm test` to verify mechanics.

### Task 2: 3D world and polished UI
Files: index.html, src/style.css, src/scene.js, src/main.js.
Interfaces: createScene(canvas) returns resize(), render(state, elapsed), dispose(); simulation entities have id, kind, x, z, and passed/contact markers.
- [x] Bundle Three.js and Vite locally; create full-screen viewport and start/pause/result overlays.
- [x] Construct stylized player/traffic cars, four-lane road, repeating markings, city blocks, guardrails, gantries, pickup meshes, sky/sun, and bounded effects.
- [x] Animate chase camera, car steering, nitro aura/exhaust, hit response, and 90-second ambience using simulation state.
- [x] Connect HUD and game events; add compact mobile layout and audio toggle with graceful fallback.
- [x] Run `npm run build` and inspect the browser for WebGL/rendering errors.

### Task 3: Controls and complete playable loop
Files: src/input.js, src/main.js, tests/input.test.js, README.md.
Interfaces: createInput(element, callbacks) exposes read(), clear(), destroy(); read() returns steer and boost intent.
- [x] Test independent keyboard/pointer state and clearing using Node tests.
- [x] Bind desktop controls and multi-pointer touch buttons; clear on pointercancel, lostpointercapture, blur, and visibility changes.
- [x] Implement start, pause, resume, game over, retry, best-score persistence, and WebGL fallback.
- [x] Verify browser play at desktop and 390x844 mobile viewport, plus button reachability and no overflow.
- [x] Write setup and controls documentation; run tests, production build, and whitespace checks.

## Completion evidence

- Implemented in the approved workspace on `codex/neon-racing`.
- Initial missing-module test failure was followed by a passing simulation suite.
- Final suite: 14/14 passing. Production build succeeds; Three.js vendor bundle produces the advisory 500 kB chunk-size warning (about 129 kB gzipped).
- Fresh code review found premature near-miss awards. Regression reproduced, fixed, and verified; traffic collision width also now matches the visible car more closely.
- Browser verified at 1440×900, 390×844, and 844×390; mobile controls are in bounds and the phone viewport has no overflow.
- Verified start, keyboard boost, mobile steering/boost taps, pause, resume, game over, retry, best-score persistence, and sound toggle. No captured browser errors.
- Simultaneous pointer state is unit-tested; no physical-phone performance or multitouch hardware testing was performed.
- Screenshot: docs/neon-racing-desktop.jpg.
