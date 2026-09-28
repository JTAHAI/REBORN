# 99½ REBORN

Browser-first WebGL2 driving-game reconstruction of a customized 1999½ Mk IV sedan.

## Play online

The live game is available at [reborn.tahai.net](https://reborn.tahai.net).

## Run

```powershell
npm start
```

Open `http://127.0.0.1:4173`. Build 004 remains preserved unchanged in `legacy/`.

## North Berwick Free Drive — Build 009

Free Drive uses a completely static North Berwick, Maine world assembled from public Maine E911 roads, Maine ESCB building footprints, and OpenStreetMap water/woods/farmland context. It performs no map or GIS API calls while playing.

Build 009 adds a driver-eye reconstruction layer:

- oriented building footprints rather than axis-aligned blocks;
- procedural New England houses with gable/hip roofs, windows, doors, porches, chimneys, foundations and roadside details;
- authored hero structures for Town Office/Police, Cumberland Farms, Fire Department, Hurd Manor, Olde Woolen Mill, Allard's, Mary Hurd Academy, Hannaford, Pratt & Whitney, Noble High School and Riverside Farm Stand;
- water, forest, farmland, sidewalks, crosswalks, street lighting, utility poles and wires;
- a lower cinematic chase camera;
- attributed open-reference facade textures for Town Hall, Hurd Manor and the Olde Woolen Mill.

See [`assets/worlds/north-berwick/CREDITS.md`](assets/worlds/north-berwick/CREDITS.md), [`provenance.json`](assets/worlds/north-berwick/provenance.json), and [`facades-atlas.json`](assets/worlds/north-berwick/facades-atlas.json). Road alignment and building placement are data-derived; procedural architecture outside the specifically referenced hero landmarks remains an approximation.

Engineering and verification notes: [`docs/NORTH_BERWICK_REALISM_BUILD_009.md`](docs/NORTH_BERWICK_REALISM_BUILD_009.md).

## Project identity

99½ REBORN is its own memorial driving game. Carpooling to Hell's Arcade / Procedural Grand Prix is maintained as a separate project and its branding, race-grid identity, rivals, vehicles, networking UI, and course progression do not belong in REBORN. See [`docs/PROJECT_BOUNDARIES.md`](docs/PROJECT_BOUNDARIES.md).

## Build 010 — Living Car and Road Memory

Gameplay pass 1 of 8 turns the Jetta and North Berwick roads into persistent parts of the game:

- fuel, battery, engine temperature, tires, brakes, oil, coolant, body condition and odometer persist in the existing save;
- vehicle condition changes acceleration, braking, grip and the ability to keep driving;
- driving style, weather and load produce gradual wear and temperature changes;
- named North Berwick roads gain familiarity as they are driven;
- learned roads are emphasized on the map and recorded in a persistent road journal;
- the garage can refuel, charge and service the Jetta without erasing its mileage or history;
- `J`, the HUD, the pause menu, and the main menu open the Jetta Status / Road Journal screen.

See [`docs/LIVING_CAR_ROAD_MEMORY_PASS_010.md`](docs/LIVING_CAR_ROAD_MEMORY_PASS_010.md). The complete eight-pass sequence is tracked in [`docs/GAMEPLAY_ROADMAP.md`](docs/GAMEPLAY_ROADMAP.md).


## Build 011 — Diagnostics and Hands-On Garage

Gameplay pass 2 of 8 adds symptom-driven mechanical faults and a permanent repair history:

- aging alternator, cooling, starter, clutch, wheel-bearing, alignment and brake-hydraulic components;
- symptoms appear before the cause is known; targeted garage tests confirm faults;
- component condition and temporary roadside fixes alter acceleration, grip, braking, steering pull, temperature and battery behavior;
- roadside triage can buy a few miles without pretending the fault is repaired;
- confirmed faults offer rebuild/preserve or replace/modern decisions;
- rebuilds retain component originality while replacements restore maximum condition;
- every diagnostic, roadside action, service and repair enters a permanent garage ledger.

Pass 2 is complete. See [`docs/DIAGNOSTICS_GARAGE_PASS_011.md`](docs/DIAGNOSTICS_GARAGE_PASS_011.md).

## Build 012 — Living Town Director

Gameplay pass 3 adds 31 persistent incident definitions, fictional town schedules, bounded lane-following traffic, town trust and follow-up assistance. North Berwick Free Drive shows a clock; amber map dots mark incidents and amber road segments mark temporary reduced lanes. The opposite lane remains available.

Stop near an incident and press **F**, or tap the contextual roadside button. Tab selects a choice, Enter confirms, and Escape returns to driving. Helping takes time and can consume battery, coolant or fuel; unsafe withdrawal calls assistance without a trust penalty. **E remains pulse**, M/minimap opens the paused map, and **J** opens diagnostics plus the Town Ledger. The clock pauses in all blocking menus and outside North Berwick Free Drive.

The existing version-1 save migrates in place. No runtime service, account or map API is added. Generic town vehicles and fictional schedules are gameplay approximations, not current real operating hours. See [`docs/LIVING_TOWN_DIRECTOR_PASS_012.md`](docs/LIVING_TOWN_DIRECTOR_PASS_012.md).

Pass 3 is complete. Later passes are documented below.

## Driver Experience — 0.9.1

An interface polish release on Build 012, not another gameplay pass:

- redesigned garage activity cards, clearer instruments and a four-tab Jetta hub;
- searchable road/landmark pins, map dragging and pinch/scroll/keyboard zoom, My Car and Whole Town views;
- independent minimap zoom and a pinned-place distance/bearing indicator (not turn-by-turn navigation);
- persisted MPH/KM/H, full/minimal HUD, high contrast, control hints and effects-volume preferences;
- keyboard-friendly dialogs, first-drive guidance, fullscreen and downloadable save backups;
- compact landscape touch controls retaining the single manual-throttle joystick and portrait rotation guard.

Run `npm test` for simulation, persistence and UX invariants; `npm run test:ux` runs isolated desktop/touch-emulated browser checks using the locally cached agent-browser CLI. See [`docs/DRIVER_EXPERIENCE_POLISH.md`](docs/DRIVER_EXPERIENCE_POLISH.md) for scope and validation limits.

## Build 013 — Maine weather and remembered surfaces

Gameplay Pass 4 adds local seeded seasons and weather, persistent named-road
surfaces, condition-sensitive traction/braking, fog and precipitation, snow/ice
dressing, public-works treatment, plow traffic and observed hazard memory.
Settings offers Seasonal Journey or explicitly labelled weather scenarios.
J → Living Town shows the weather and road-surface ledger. Existing story/modes,
modern UX, saved condition and town history remain. Pass 5 continues below.

The full memorial website now has maintained source instead of depending on
manual edits to an old ZIP. `npm run package:site` produces the full website
(`/play/` inside) and its matching standalone game in `packages/`. It requires
Node and Python 3 for standard-library ZIP creation; no runtime server is added.
Run `npm run test:site` after the site build. Browser-only acceptance is available
through `npm run test:site:browser` and `npm run test:weather:browser`.

No build command deploys production. The recorded host uses Workers Static
Assets; preserve the existing deployment configuration. Never replace the
memorial homepage with game-only `dist/`. See
[`docs/MAINE_WEATHER_ROADS_PASS_013.md`](docs/MAINE_WEATHER_ROADS_PASS_013.md) for
model assumptions, bounds, migration, packaging and verification details.


## Build 014 — Drive stories and passengers

Gameplay Pass 5 adds three complete fictional North Berwick passenger drives:

- **The Long Way Home** — honor or break a request to avoid the mill corridor;
- **The Last Part Before Closing** — protect the Jetta, beat a fictional handoff window, or make no promise;
- **First Snow** — choose treated main roads or accept a winter shortcut.

The conversations happen while the car remains under player control. `1`, `2`,
or `3` selects a response; silence is a visible choice and also the bounded
timeout response. Named roads, weather, braking, grip, body condition, engine
temperature and elapsed town time influence relationship outcomes. Active trips,
trust and commitments persist across reloads and appear in the Passenger Drives
tab and Road Journal. All passengers and personal situations are fictional.

The existing version-1 save key remains unchanged. No runtime account, server,
map API, telemetry or generated-dialogue service is added. Run
`npm run test:stories:browser` for the passenger UI acceptance in addition to
the normal test and full-site gates. See
[`docs/DRIVE_STORIES_PASS_014.md`](docs/DRIVE_STORIES_PASS_014.md).

**3 gameplay passes remain.**

### Pass 5 interaction and reliability

Open **Passenger Drives** from the garage, or `J` → **Passenger Drives**. The first response appears at pickup; `1`/`2`/`3`, touch buttons, or silence choose the reply. Unanswered questions retain their deadlines through reloads. Stops, final dialogue and a parked arrival gate each ending; the garage asks before abandoning a commitment. An unsafe-car onward-transport option avoids unfair trust loss. The fictional parts handoff uses five active-driving minutes rather than the town clock. Authored weather preferences restore after the trip without erasing accumulated road surfaces.

Packaged-browser ending checks use explicit saved-position fixtures. They supplement—not replace—production route/choice tests, ordinary launch/input tests, and real-device review.

## Echo Roads — Build 015 / Pass 6

Open **J → Echo Roads → Begin a memory drive**. Six copper markers trace a quiet
North Berwick loop. Slow below 6 mph near a marker and notice the place today.
Press **V**, or tap **Enter Memory**, to compare an imagined 1999½ layer. After
both views, use J to keep the place, keep the feeling, or leave it unspoken.
Return to Today after all six reflections for the homecoming. No score or timer.

Mapped landmark shells remain authoritative. Earlier furniture, facade finishes,
traffic dressing and sound are authored memory cues, **not a verified 1999 town
survey**. No historical photos, private residents or commercial music were added.
Progress and the active view survive reload; ending the drive preserves discoveries.
Passenger commitments must end before beginning a memory drive.

`npm run package:site` builds the full memorial website and matching standalone
from the same commit. `npm run test:echo:browser` exercises the packaged experience.
See `docs/ECHO_ROADS_PASS_015.md` for boundaries and verification.

**Pass 6 of 8: 2 gameplay passes remaining.** This is a prototype milestone, not
physical-device acceptance, final historical accuracy or production deployment.


## Drive Memories — Build 016 / Pass 7

Eligible North Berwick Free Drives can now become bounded local route memories.
Open **J → Drive Memories** to select a recording, inspect its route and mechanical
summary, run a spectral Jetta ghost, or watch a cinematic replay. **G** pauses or
resumes the active ghost and **Shift+G** stops it. Replays support pause/play,
timeline seeking, 0.5×–2× speed and chase, roadside, orbit and driver cameras.

The recorder stores a compact route trace, speed/input state, temperature,
battery and five diagnostic-severity channels. It keeps no more than five drives
with bounded samples, markers and history. Data remains in `995.reborn.save.v1`;
there is no upload, account, telemetry, live map service, microphone recording or
cloud database. The player can disable recording or diagnostic audio at any time.

Diagnostic audio is synthesized locally with Web Audio from the Jetta's existing
fault state. Wheel-bearing hum, charging whine, cooling strain, clutch slip and
brake symptoms can be heard during ordinary driving and replay without bundling
commercial music or external sound files. These cues support diagnosis; they do
not claim physically exact acoustic modeling.

`npm run test:memory:browser` exercises recording, Road Journal linkage, ghost
controls, map route, replay cameras/seek/speed, audio nodes and touch layout. The
normal full-site, offline, historical-cache, vehicle and world gates remain.
See [`docs/MEMORY_GHOSTS_REPLAY_AUDIO_PASS_016.md`](docs/MEMORY_GHOSTS_REPLAY_AUDIO_PASS_016.md).

**Pass 7 of 8: 1 gameplay pass remaining.** Final integration, balancing,
performance tiers, accessibility and release hardening remain Pass 8.

## From Justin's driveway — optional workshop recollection

**J → Workshop → Remember the install.** The red AEM intake, one mount underneath
the engine, the other on the opposite side, and a driveway-sized vocabulary lesson.
All choices succeed. Skip or close at any time. No repair timer, penalty, cost or
performance upgrade. Mild by default; **Memory options → Sailor vocabulary**
enables stronger dramatized language for this story only. Completed memories add
optional quiet callbacks after diagnostics, repairs and routine service.

Workshop menus now remain accessible in portrait; the landscape guard is reserved
for driving and replay. Hub headings follow the selected task. Replay starts paused
so a short memory cannot end while the player is choosing a camera.


## Hometown UX and release hardening — Build 017 / Pass 8

The Jetta Hub now has four primary sections: **Drive**, **Jetta**, **Town**, and
**Journal**. The existing seven task panels remain available underneath them.
A compact selector replaces the crowded primary navigation on narrow screens.
The garage continues a passenger or Echo commitment and shows actual town-load
readiness. A failed North Berwick load has a retry, not a silent substitute map.

The driving HUD gives passenger objectives, instruments, warnings and touch
controls separate regions. Settings add 100–200% reading size, mechanical-sound
captions and an optional **Pause to read** choice mode. Very small screens and
large text automatically hold the choice clock while reading. Manual throttle,
M/minimap pause, J hub, F roadside interaction, E pulse and V Echo comparison stay.

**Town → Open North Berwick Map** works from the garage or a paused drive. A pin
now has a mapped-road path using Direct, Cautious or Familiar routing preferences.
Disconnected or distant locations explicitly fall back to a pin and bearing.
These are static game routes, not current traffic, legal access or real-world
safe-driving advice. Cautious routes use simulated conditions, not live weather.

**Settings → Restore save backup** validates a local backup, previews it and asks
for confirmation. A pre-restore copy is retained. Corrupt stored originals are
protected instead of overwritten. Reset requires typing RESET. Updated game
installations wait for approval and idle game tabs; an active trip is not reloaded.

Rendering uses a spatial static-scene index, reusable instance staging buffers,
resource cleanup on world changes and bounded menu-render frequency. This reduces
work without changing the fixed-step driving model. Real-phone frame rates and
final visual acceptance remain unmeasured; software-browser acceptance is separate.

The red AEM driveway memory remains optional, skippable and mechanically harmless.

```sh
npm run build:site     # maintained full memorial site, /play/ and matching download
npm run test:site      # package structure, local links, matching game and assets
npm run package:site  # FULL-WEBSITE.zip + Standalone.zip + checksums in packages/
```

See `docs/RELEASE_HARDENING_PASS_017.md` for exact scope, acceptance and limitations.
After all Build 017 gates pass: **0 planned engineering passes remain**. This is
completion of the scoped eight-pass prototype sequence, not a claim of a finished
commercial game, accessibility certification, owner acceptance or deployment.
