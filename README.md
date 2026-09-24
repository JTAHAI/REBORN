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

Pass 2 is complete. **6 gameplay passes remain.** See [`docs/DIAGNOSTICS_GARAGE_PASS_011.md`](docs/DIAGNOSTICS_GARAGE_PASS_011.md).
