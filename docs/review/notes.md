# Final review evidence — 2026-10-06

Baseline: 139 automated tests passed before polish. Browser observations are from the actual Three.js renderer and development fixture controls. Sustained runs use the test driver, without invincibility or altered spawn/difficulty settings; they are not a substitute for independent human playtesting.

Three seeded, simulation-only 240-second runs reached 13.13–14.17 km with 1–2 crashes each. Average traffic in the next 320 metres rose from 4.9–6.4 vehicles in the first 2 km to 8.9–11.8 at 8–10 km. The driver braked 5–11% of decisions early and 15–29% at 8–10 km. No nitro was used by that driver. These samples support increasing traffic pressure, not a guarantee against every unfair random encounter. Raw data: seeded-runs.json.

Audio review is limited to implementation and scheduling tests: starter/engine/event oscillators exist, but no listening judgement is claimed. Physical-phone GPU, touch ergonomics, thermal throttling and audio latency need device testing.

Browser sustained run: 159.4 seconds / 9.22 km observed, 2 crashes/respawns, shield 82 after pickups, 17 traffic signals and 11 completed lane changes, 76 pickups, 13 vehicles in the next 320 metres (16 total). Reported average refresh approximately 120 FPS; render-call sample 2.20 ms, 804 draw calls, 53 geometries / 19 textures. Geometry/texture counts stayed stable after warm-up. This is one desktop/browser observation, not a GPU benchmark or mobile performance certification. `browser-run.txt` records the later snapshot at capture time.

Confirmed pre-polish defects and changes:
- At 844×390, the speed number rendered over the pause Resume button. Added dialog stacking above instruments, bounded height and scrolling.
- How to Play focused the bottom Back button on open, automatically scrolling its title out of view in landscape. Focus now starts at the heading and scroll position zero; a wider compact layout fits the full text and buttons at 844×390.
- Escape did not dismiss How to Play, and Back lost keyboard focus. Escape now returns to the underlying menu without resuming a paused run; Back/Escape restore focus to How to Play. P retains its previous pause behavior.

Post-change browser checks confirmed unobstructed Resume, full landscape instructions, focus on help-title at scrollTop zero, and return focus on how-menu/how-pause. No driving, traffic, nitro, car, headlight, audio or balance changes were made.

## Assessment and priorities

| Area | Observation | Assessment |
|---|---|---|
| Fun / decisions | Late traffic made the test driver alternate braking, lane changes and opposing lanes; partial boost cancels on brake, automatic full boost ends at seven seconds. | The core choices have consequences. Subjectively, the repeated straight-road/Inner Loop scenery and repeated traffic encounters will limit longer sessions; more effects would not address that. |
| Challenge / fairness | Density increased in all three seeded runs. Browser sustained run needed two recoveries after 6 km. Both barrier fixtures held contact for multiple seconds without extra damage. | Progression is real. No unavoidable collision was proven, but random fairness and new-player difficulty are not exhaustively established. |
| Driving feel | The brake-behind-truck fixture collected its orb at 55 km/h with shield 100 and the truck 28.3 m ahead. Crash stopped the car, followed by reduced-speed recovery. | Movement, speed and collision feedback are connected. Numeric fixtures confirm behavior; human control feel remains partly subjective. |
| Readability | Busy portrait scene kept speed, shield, nitro, oncoming status, near miss and gain separated. The shield turned warm and pulsed before disappearing. | Strong persistent/transient hierarchy. Portrait framing makes the player and distant motorcycles small; real-phone recognition needs testing. |
| Visual cohesion | White/black AE86 remains distinct against the dark road; fixed angled headlights and restrained body design are intact. Repeated rectangular traffic and buildings contrast with its more detailed model. | Cohesive retro-neon palette. Subjectively, traffic/environment are visibly more primitive than the hero car, rather than equally finished assets. Preserve the design; consider detail work later. |
| Audio | Toggle reached Mute sound; source and tests cover starter, filtered engine oscillator and short event tones. | Enable/mute wiring is verified. Sound quality, fatigue, loudness and device latency were not listened to or judged. |
| Usability | Tutorial replay completed its action sequence; launch progressed from speed 0 to 62 m/s with score/time zero before handoff. Landscape modal/focus defects reproduced and fixed. | Clear core onboarding and short retry path. Keyboard help navigation is better after this pass. |
| Performance | Sustained desktop report stayed around 119–120 FPS after warm-up, geometry/texture counts stable, and up to 804 draw calls in the captured scene. | No obvious desktop slowdown in sampled scenes. Draw count warrants lower-end-phone validation; no frame-time percentiles, heap profile or thermal test was performed. |

Must fix: the confirmed pause overlay and help navigation/scroll defects — fixed and browser-retested. No other confirmed release-blocking defect was found in the exercised paths.

Worth polishing next: validate portrait traffic recognition and sound mix with actual players on phones before claiming broad mobile readiness. No speculative balance changes made.

Optional later: encounter/scenery variety and matching traffic art detail to the AE86. These are larger creative decisions, not prerequisites for sharing a playable build. No additional feature is required for this pass.
- Additional confirmed rendering defect: desktop pause/game-over backdrop blur painted a displaced rectangular tile outside the dialog after viewport changes. Replaced backdrop blur with a nearly opaque panel; repeated live pause screenshot no longer shows the tile (`desktop-pause-fixed.png`).

## Verification completed

- Baseline suite 139/139; final suite 140/140, production build and whitespace checks pass.
- Live menu, ordinary ignition/moving handoff, tutorial replay/action completion, pause/help, crash/recovery, game over and quick retry. Launch instrumentation records 0 speed/time/score during ignition, 31.07 m/s during moving pullback, and 62 m/s with the settled camera before gameplay begins. Tutorial was exercised through replay rather than deleting the user's existing completion preference.
- Sustained browser run past 8 km plus three simulation-only 240-second seeded runs.
- Partial boost without shield; brake override; full boost automatically stopped at 7.0 s with zero bonus and no visible shield; busy portrait shield-expiry/near-miss/pickup/oncoming scene.
- Braking behind a truck collected the orb with no damage; sustained left and right barrier contact each reduced shield once to 66 and did not repeat after recovery expired. Recovery blink and crash particles observed.
- Desktop 1440×900, portrait 390×844, landscape 844×390, plus the initial app viewport. Keyboard Escape/Back focus restoration checked from both menu and pause. Browser console reported no errors.
- Sound enable/mute UI toggled successfully. No listening assessment, physical touch-device test, low-end GPU benchmark, exhaustive random-seed fairness proof, or fresh-storage first-visit test is claimed. Automated tests cover tutorial rules, multi-pointer controls, protection/grace edges, nitro banking, timing and reset behavior.

Verdict: ready to share as a playable desktop-first beta. No known blocker remains in the exercised paths. A broad mobile/audio quality claim still requires real-device and listening checks. No new feature is needed to share this build.
