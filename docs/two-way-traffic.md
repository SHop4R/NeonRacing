# Two-way traffic and distance difficulty

## Model

All gameplay distances use meters and seconds. Displayed km/h is actual player speed ×3.6. The moving-world camera stays fixed in X/Y, while road/scenery move by actual distance traveled. Buildings are stationary at every depth: perspective supplies parallax, rather than artificially reducing their world speed.

Traffic owns a positive speed and a direction (+1 same direction, −1 oncoming). Its relative forward distance changes by `−(playerSpeed − direction × trafficSpeed) × dt`. Pickups have zero longitudinal world velocity. Their bobbing/rotation is local; magnet changes lateral position separately. Collection remains lane-wide with a 2.5 m swept longitudinal gate.

For an equivalent 90 km/h vehicle:

| Player speed | Same-direction closing | Oncoming closing | Stationary orb approach |
| --- | --- | --- | --- |
| 160 km/h | 70 km/h | 250 km/h | 160 km/h |
| 400 km/h | 310 km/h | 490 km/h | 400 km/h |

That means overtaking closes 4.43× faster at 400, and road/orb travel is 2.5× faster. These are geometric movement differences, independent of effects.

## Road and traffic

Two right lanes flow with the player; two left lanes flow toward them. Crossable double amber center lines and directional arrows mark the split. Opposing vehicles rotate 180°, exposing white headlights instead of red taillights. Amber signals stay distinct from white warning flashes.

Each class uses its own mesh, dimensions, cruise range, acceleration response, maneuver probability, and crossing duration. Cruise speeds can fall below their range when following slower traffic.

| Type | Cruise km/h | Width × length m | Crossing seconds | Relative lane-change likelihood |
| --- | --- | --- | --- | --- |
| Truck | 65–86 | 2.35 × 7.4 | 2.6 | 22% |
| Van | 79–104 | 2.05 × 5.1 | 2.2 | 35% |
| Pickup | 90–119 | 2.05 × 4.8 | 1.8 | 55% |
| Sedan | 97–130 | 1.85 × 4.4 | 1.65 | 65% |
| Hatchback | 108–140 | 1.75 × 3.5 | 1.45 | 80% |
| Motorcycle | 119–158 | 0.75 × 2.25 | 1.3 | 100% |

Crossing times vary ±5%. The 2.4-second, 1.25 Hz amber warning remains. Maneuvers only connect the two lanes belonging to the vehicle's direction. Destination checks project traffic over the warning plus crossing duration. Following uses vehicle lengths and a speed-dependent bumper gap. Collision extents account for body yaw during lane changes. The player's existing mesh is unchanged.

## Difficulty

Smoothstep progression uses actual distance from 0 to 8 km, capped thereafter.

| Distance | Cruise km/h | Encounter spacing m | Third-vehicle chance | Base maneuver decision interval s |
| --- | --- | --- | --- | --- |
| 0 km | 223 | 150 | 45% | 5.00 |
| 2 km | 233 | 137 | 52% | 4.61 |
| 4 km | 256 | 108 | 69% | 3.75 |
| 6 km | 278 | 78 | 85% | 2.89 |
| 8+ km | 288 | 65 | 92% | 2.50 |

Every encounter attempts one same-direction and one oncoming vehicle, plus an optional third. Spawns can be rejected for occupied space or unsafe combined approach windows. The old furthest-car spacing gate and timer compensation were removed; neither can nullify the density ramp. Maximum population is 48 traffic vehicles; pickup population is separately bounded. Spawns are at least 320 m ahead and at least 3.2 seconds away at current closing speed; opposing vehicles get extra lead time for full signaling and crossing. Combined approach windows are checked at both current speed and maximum boost speed. This is a conservative safety check, not a mathematical proof for every possible player maneuver.

## Oncoming reward and warnings

Player center left of the divider activates a configurable 2× multiplier on distance-earned driving score, stacking with combo. The badge disappears at/after the center line. Only positive forward progress earns it; pickups and near-miss scores retain their original rules. Crashing disables the bonus.

An oncoming car in the player's path gives one white double-flash burst, approximately 2.5 seconds before arrival, within a bounded 85–340 m warning zone and 1.8 m lateral corridor. It does not flash continuously or warn across unrelated lanes.

Nitro charge/drain, partial hold/full automatic controls, shield and magnet deadlines, braking priority, recovery blinking, and Z-only camera behavior remain intact.

## Verification

Automated coverage includes equivalent 160/400 closing speeds, stationary orb displacement and lifetime, center-line reward transitions, each class's dimensions/speeds, swept collisions including rear approaches, lane-direction restrictions, headlight bursts, wide-truck braking overlap, and distance density progression. Existing nitro, controls, crash, camera, underglow, and HUD tests remain part of the suite.

A seeded 220-second simulation reached 14.13 km using a test driver that only steers and brakes: no invincibility or health overrides. Nearby traffic averaged 6.5 vehicles early and 9.84 after 8 km; total population peaked at 21, below the 48 cap. All six classes appeared, 15 maneuvers completed, and 24 headlight warnings occurred. There were three recoverable crashes and zero traffic-to-traffic overlaps. A separate review ran twelve seeded 180-second probes without traffic overlaps.

Physical phone hardware remains untested. Browser viewport tests are not a mobile hardware benchmark. The Three.js production bundle retains its nonblocking size advisory.

Final checks: 70/70 tests pass; production build and whitespace checks pass. The review's truck-width braking issue was reproduced with a failing regression, fixed using the actual collider width, then verified by the complete suite. Stationary pickups no longer time out while waiting.

Live browser play reached 9.86 km over 155.3 active seconds, with 12 nearby / 16 total vehicles, 11 observed lane changes, two recoverable crashes, and approximately 117 FPS locally. At 3.9 km the same run had 6 nearby / 7 total vehicles. The driver only steered and braked; it did not activate nitro, change health, or disable collisions.

A calibrated, three-second real-renderer comparison through equivalent traffic covered 133 m at 160 km/h versus 333 m at 400 km/h. At 160 the leading same-direction vehicle remained 61.5 m ahead and the orb remained uncollected. At 400 both vehicles had passed behind the player and the stationary orb was collected. Desktop 1440×900 and mobile 390×844 checks confirmed vehicle orientation, distinct class silhouettes, white warning flashes, center markings/arrows, readable oncoming 2× badge, and no horizontal overflow. No captured browser errors. Screenshots: `two-way-vehicles.png`, `two-way-mobile.png`.
