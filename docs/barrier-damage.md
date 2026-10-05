# Barrier contact correction

## Root cause

The earlier code clamped to a fixed center-position limit before inspecting impact motion. It then tested forward speed and a repeating cooldown, so unchanged contact could turn into another full crash when the cooldown or protection expired. The old 5.45 m center limit also did not match the visible rail's inner face.

## Current behavior

- Rendered rails and collision planes share their center (±6.9 m) and thickness (0.22 m). Collision resolution subtracts the player's actual physics half-width from the inner face (±6.79 m). Normal center contact is approximately ±6.079 m.
- Attempted lateral travel is checked before clamping. A fresh impact at 1.2 m/s or greater into the rail uses the existing 34-point shield damage, absorption, crash and respawn behavior. Forward speed does not determine impact severity.
- Contact latches until the collider separates by 0.06 m. Holding against a rail or driving parallel never causes another crash. Outward velocity is removed and position resolved exactly to the inner boundary.
- Gentle contact and sustained pressure use sparse, short-lived sparks with no damage, popup or repeated impact sound. There is no scrape damage timer.
- Shield/recovery/grace expiry cannot turn an existing contact into a new impact. Collider expansion and placement at a rail resolve safely without impact. Visual body transforms are not used for bounds.
- Barriers are continuous planes; decorative posts and scenery recycling do not create collision segments or gaps. Camera framing and normal driving/nitro tuning are unchanged.

## Validation

128 automated tests pass. Barrier cases cover both sides, 30/60/120 Hz, 55/160/400 km/h, direct/shallow impacts, parallel and held contact, separation/re-impact, depletion through distinct impacts, protection/cancellation/expiry, collider growth, placement, pause/restart, tutorial safety and extended road travel. Code review found no outstanding issues. Production build passes.

Live browser: each wall produced one initial hit (100 → 66). Continued right-wall steering for 18.2 seconds covered over 1 km with shield still 66, one respawn, no repeated crash, stable position and only two scrape particles. Left-wall contact remained at 66 shield after 84 seconds and 5.59 km, with one respawn and no additional crash. No browser errors were recorded.
