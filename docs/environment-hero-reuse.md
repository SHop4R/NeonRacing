# Complete surroundings, reuse and the Nightjar

## Visual changes

The menu now has continuous road, divider, barriers and roadside fixtures for 900 metres in both directions, plus the existing large ground surface. There are 252 windowed buildings distributed across both sides and the full 1,680-metre recycling span, with 84 simple distant skyline blocks. Buildings and silhouettes recycle beyond the 650-metre fog boundary, including during the menu-to-driving transition.

The original Nightjar player car uses a low nose, short canopy, broad rear shoulders, recessed rear panel, paired bracket taillights, twin exhaust outlets, a small diffuser, side inlets and faceted wheels. Silver-blue upper panels and violet lower panels support the silhouette without adding excessive neon. Existing brake-light, flame, ribbon, underglow and body-animation interfaces remain intact. Physics dimensions, handling, collision tuning and launch timing are unchanged.

## Rendering and reuse

- Repeated lane markings, arrows, posts, lamps and skyline pieces are instanced in spatial batches. Frustum culling remains useful for each batch.
- Building visibility follows the active camera with an 18-metre bound margin and a generous distance allowance. Distant buildings keep the main windowed body while secondary accents/base details are omitted beyond 450 metres. Traffic simulation does not depend on visibility.
- No custom occlusion-culling system was added: spatial batching produced a measurable improvement without its complexity.
- Visual pools are keyed by six traffic classes and three pickup kinds. Prewarm: four of each traffic class, twelve energy pickups, four nitro and four repair pickups (44 total). Growth is bounded by simulation population limits: 48 per traffic class and 40 per pickup kind. Released transforms, body pose, lights, signals and pickup opacity are reset; gameplay entities retain freshly initialized simulation state.
- All 96 particle records and two sets of 36 trail samples are reused. Ribbons clear on restart/respawn. Projection scratch vectors and repeated pickup, building-contact, and motorcycle geometries are shared.

## Measurements

Same six-vehicle fixture, 1440 × 900, fixed gameplay camera, local in-app browser:

| Metric | Before | After |
| --- | ---: | ---: |
| Draw calls, including postprocessing | 1,462 | 556 |
| CPU render-submission sample | 2.4–2.7 ms | 1.6–1.7 ms |
| Uploaded geometries in that view | 113 | 28 |
| Textures | 19 | 19 |

Draw calls fell approximately 62% while surroundings grew. These are local samples, not GPU timings or a general device benchmark. Twenty repeated six-vehicle restarts created no objects beyond the initial 44 and recorded 120 pool reuses. A sustained run reached 47 visual objects and 31 uploaded geometries as additional pickup kinds entered view; those counts remained unchanged between 30 and 75 seconds, while reuse increased from 42 to 93. Textures remained at 19.

## Verification and limits

133 tests pass and the production build succeeds. New checks cover pool bounds/reset/reuse, spatial instance bounds, camera-facing visibility, persistent effect storage across runs, and projected pickup/traffic overlap. Review caught a reversed projection-bound convention during optimization; it was fixed and covered by a regression test.

Browser checks covered all five cinematic shots, a rear-facing ultrawide view, full nitro, crash particles/body motion, and simultaneous steering/braking with readable brake lights and flat underglow. Mobile and sustained-run final observations are recorded below. JavaScript heap allocation traces, GPU timing queries and physical-phone thermal performance were not measured; object/GPU resource counters are used as bounded-growth evidence.

Final live run: 132.4 seconds, 5.95 km, 189 pool reuses, 56 visual objects created as population increased, 31 uploaded geometries and 19 textures. No browser errors. Both recorded GPU counters were unchanged from the 30-second sample. This demonstrates bounded reuse and stable GPU resources in the exercised session, not a formal heap-leak proof.

Actual 390 × 844 screenshots verified the front-facing view into the formerly empty rear environment and the wheel/side close-up. The closest shot intentionally crops the car for a detail view. The existing ignition hold and moving camera handoff completed with the new scene and car. Desktop checks used 1440 × 900; the rear-facing environment was also inspected at 2560 × 1080.
