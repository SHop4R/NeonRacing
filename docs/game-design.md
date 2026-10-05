# Neon Racing — game design

## Intended experience
A polished browser-based 3D arcade racer with an immediate sense of speed, neon cyberpunk highway scenery, traffic to dodge, and power-ups to collect. Desktop keyboard and mobile touch controls must support the complete game loop.

## Recommended approach
Use Three.js with WebGL for real perspective, lighting, fog, and smooth chase-camera motion. Use locally bundled dependencies and procedural geometry so the game does not depend on remotely loaded models or textures. A lightweight HTML overlay provides legible, accessible controls and status. Separate the simulation from rendering and input so gameplay can be checked independently.

A pseudo-3D Canvas implementation would be lighter but would compromise the requested 3D presentation. A full physics engine would add complexity without improving this arcade steering model. Three.js with a custom arcade simulation is the recommended middle ground.

## Presentation
A full-viewport four-lane elevated highway, reflective-looking dark road, cyan guardrails, magenta lane accents, illuminated city towers, overhead signs, and a stylized sports car. A low chase camera, road streaks, exhaust, and a modest field-of-view increase communicate speed. Nitro adds brighter trails and a cyan protective aura. Camera shake remains brief and restrained.

A smooth 90-second ambience cycle moves between violet night and warm neon dawn/day. Fog, sky, city lighting, and road illumination interpolate together. The HUD shows score, best score, multiplier, shield, speed, and nitro. A start screen explains controls; a results screen shows the run score and offers immediate retry.

## Driving and controls
Forward motion is automatic. A/D or left/right arrows steer continuously with responsive acceleration and damping. Space or Shift activates nitro. P or Escape pauses, and R restarts after a crash. On touch devices, large left/right press-and-hold buttons and a dedicated nitro button allow simultaneous steering and boost. Input resets on focus loss, pointer cancellation, and tab changes; backgrounding pauses the game.

## Gameplay rules
- Shield begins at 100. A traffic collision removes 34 shield, slows the car briefly, and resets the multiplier. A short damage cooldown prevents repeated damage from the same impact. Zero shield ends the run.
- Nitro uses one stored charge for a 2.5-second speed burst. It grants invincibility and attracts nearby pickups during the burst. Capacity is three charges, and a run starts with one.
- Nitro pickups restore one charge. Repair pickups restore 25 shield, capped at 100. Energy pickups award 100 base points.
- Passing a traffic car within a narrow safe lateral margin awards a near miss: 200 base points and multiplier progress. Each car can award this only once. Collisions and invincible contacts never count as near misses.
- Distance, energy pickups, and near misses contribute score. Clean driving gradually increases the multiplier from x1 to x5; near misses accelerate growth. Collisions reset it to x1.
- Traffic density and speed increase gradually with survival time, with bounded difficulty. Spawn patterns leave navigable escape routes and avoid overlapping traffic and pickups.
- Best score is stored locally when browser storage is available. Storage failure never interrupts gameplay.

## Implementation boundaries
A simulation module owns movement, traffic spawning, collisions, pickups, scoring, and run state. A rendering module owns the scene, camera, effects, and ambience. An input module combines independent keyboard and pointer state. Application wiring owns the animation loop, menus, audio toggle, and persistence. Reuse scene objects and cap effect counts for stable mobile performance. Cap pixel density and show a useful message if WebGL is unavailable.

## Acceptance checks
Verify starting, steering, boost consumption and duration, invincibility, pickup attraction, repair limits, collision cooldown, near-miss uniqueness, multiplier growth/reset, pause/resume, game over, and restart. Check the real browser at desktop and narrow mobile sizes, including simultaneous touch controls, readable HUD, no page overflow, and no browser errors. Confirm the ambience changes during play and the game remains playable without sound.
