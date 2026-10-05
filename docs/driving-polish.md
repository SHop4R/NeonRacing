# Motorcycle, nitro, braking, respawn, and close-pass polish

This revision supersedes the corresponding values in earlier refinement notes. The player mesh, two-way layout, distance difficulty, controls, and neon presentation are preserved.

## Final tuning

- Motorcycle cruise: 42–52 m/s (151–187 km/h), above every other class's entire range. Acceleration response 3.5/s; signaled crossing remains 1.3 s ±5%, after the existing 2.4-second warning. A motorcycle impeded by slower traffic gets overtaking priority only when the destination passes the same predictive clearance and direction checks.
- Other cruise ranges are unchanged: truck 65–86, van 79–104, pickup 90–119, sedan 97–130, hatchback 108–140 km/h. Following traffic can reduce speed below its cruise range.
- Motorcycles retain their 0.75 × 2.25 m footprint. Cyan, coral, amber, or lavender fairings replace dark bodywork; cream riders and pale blue helmets separate the silhouette. Tires and small mechanical parts remain dark. Actual round wheels, fenders, arms, windscreen, a 0.38 m white headlamp, and 0.34 m red taillamp improve recognition without floating markers or glow outlines.
- Full automatic nitro lasts 7 seconds. Its fuel drains at 1/7 per second; shield and magnet share the same fixed deadline and stop on cancellation. An orb can refill fuel but cannot extend the deadline; the active HUD shows the lesser of available fuel and remaining time/7. At automatic expiry, fuel is exhausted. Partial hold boost still drains at 1/10 per second, recharges over 30 seconds, and has the unchanged 0.75-second recharge delay.
- Open-road brake target: 55 km/h (15.278 m/s), response 7/s instead of 5/s. From starting cruise this reaches below 56 km/h within one second. Traffic-aware braking may slow further, including to a stop behind a stopped queue. The slowest truck cruises at 64.8 km/h, so holding brake lets it pull ahead. Release restores normal acceleration. Brake retains priority over nitro, rear-light brightening, and forward pitch.
- Impact stores lateral X and road distance. Forward progress stops during the 0.85-second crash animation, preventing the moving-world origin from carrying the impact point away. Traffic continues its own motion. Respawn restores the stored X, clears steering/body orientation, sets 32 m/s (115 km/h), and starts the existing 2.2-second blinking protection. Only traffic threatening that local path is cleared; other lanes and pickups remain.

## Collision and near-miss envelopes

| Vehicle | Width reduction | Length reduction |
| --- | --- | --- |
| Player | 12% | 4% |
| Truck | 10% | 3% |
| Van / pickup | 12% | 4% |
| Sedan / hatchback | 13% | 5% |
| Motorcycle | 10% | 3% |

The reduced chassis extents are projected for lane-change yaw. Traffic-to-traffic spacing continues to use full visible dimensions. The near-miss envelope adds 0.55 m of lateral proximity and waits until the full visible bodies plus 0.3 m longitudinal clearance have passed. Each vehicle can score once. Lingering beside it cannot score until a pass completes. Collision contact or protected body overlap permanently disqualifies that vehicle from near-miss points, even after protection expires.

## Verification

79 automated tests pass, including seven-second auto expiry with/without an orb, HUD halfway depletion, unchanged partial drain and recharge, pause/cancel behavior, all four lanes and intermediate impact coordinates, frozen crash road position, local hazard cleanup, slow-truck braking, every class's clean near pass and substantial collision, lingering/protected-overlap exclusions, and motorcycle signaling/overtaking without traffic overlap. Existing camera, glow, input, distance difficulty, and recovery tests remain green. Independent source review found no actionable issues.

Physical mobile devices are not tested; viewport checks do not establish phone hardware performance. The production build retains the nonblocking Three.js bundle-size advisory.

Live browser checks: automatic nitro stopped at 7.0 seconds with fuel 0, bonus time 0, and shield sphere hidden. A crash at X=-3 between the oncoming lanes respawned at X=-3 with zero body yaw/roll; the 2.2-second recovery recorded 163 visible and 101 hidden frames. The motorcycle overtake fixture produced a full warning and completed maneuver with no player damage. Front/rear motorcycle fixtures were inspected at 22 m and 65 m in desktop 1440×900 and mobile 390×844 viewports. Bright fairings, contrasting rider/helmet, white headlamp, and red taillamp remain readable; screenshots are `motorcycles-desktop.png` and `motorcycles-mobile.png`.
