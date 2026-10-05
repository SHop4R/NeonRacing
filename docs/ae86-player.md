# Panda AE86 player car

Player-only procedural three-door Trueno model: white angular body, black lower body and bumpers, raised rectangular pop-up headlights, raked windshield and hatch, long doors/quarter windows, mirrors, eight-spoke period wheels, rectangular red/amber/reverse rear lamps and one tailpipe. The existing road-aligned underglow remains a gameplay effect.

Physics, tuning and traffic-model files are byte-identical to the pre-change baseline. Headlight/brake colors and flame/trail sockets are player-owned; the single exhaust emits the flame, with two rear-lamp trails. The complete resting body fits inside the existing 2.05-unit shield sphere.

Validation: 137 tests passed; production build and diff whitespace checks passed. Browser inspected at 1440×900 and 390×844: front cinematic, rear gameplay, steering with brakes, full nitro with shield/single flame/twin trails, and crash pose. No browser console errors. Reviewer-discovered opaque window shell was removed; raycast regression tests verify exposed front, side and hatch glass.

Screenshots: ae86-front.png, ae86-gameplay.png, ae86-nitro.png.

Historical reference: https://www.toyota-global.com/company/history_of_toyota/75years/vehicle_lineage/car/id60009032/
