# 99½ REBORN

Browser-first WebGL2 driving-game reconstruction of a customized 1999½ Mk IV sedan.

## Play online

The live game is available at [reborn.tahai.net](https://reborn.tahai.net).

## Run

```powershell
npm start
```

Open `http://127.0.0.1:4173`. Build 004 remains preserved unchanged in `legacy/`.

## North Berwick Free Drive

Free Drive uses a completely static North Berwick, Maine world assembled from public Maine E911 roads, Maine ESCB building footprints, and OpenStreetMap water/woods/farmland context. It performs no map or GIS API calls while playing.

The driver-eye reconstruction includes oriented footprints, procedural New England houses, current town-center corrections, hero landmarks, water/forest/farmland context, sidewalks, crosswalks, street lighting, utility infrastructure, a lower chase camera, and attributed open-reference facade materials.

## North Berwick Grand Prix — curated alternate merge

The uploaded alternate prototype was reviewed and its strongest reusable systems were integrated without replacing REBORN's identity or canonical Free Drive mode:

- visible road course and nine hometown landmark gates;
- five local AI rivals and race-position HUD;
- turn guidance, scoring, combos, drafting, overtakes, drift bonuses, boost pads and hazards;
- Jetta tune/paint profiles and bot difficulty;
- improved boot, fullscreen, installable PWA and offline cache.

The alternate parody finale, talking-head spectators, experimental vehicles/hood and public networking controls were not exposed. Mobile driving remains keyboard-equivalent: up accelerates, down brakes/reverses, left/right steer, and auto-throttle defaults off.

See [`docs/ALTERNATE_GRAND_PRIX_MERGE.md`](docs/ALTERNATE_GRAND_PRIX_MERGE.md) and [`docs/NORTH_BERWICK_REALISM_BUILD_009.md`](docs/NORTH_BERWICK_REALISM_BUILD_009.md).

See [`assets/worlds/north-berwick/CREDITS.md`](assets/worlds/north-berwick/CREDITS.md), [`provenance.json`](assets/worlds/north-berwick/provenance.json), and [`facades-atlas.json`](assets/worlds/north-berwick/facades-atlas.json) for geographic and facade provenance. Road alignment and building placement are data-derived; unreferenced architecture remains an approximation pending owner-captured street-level video.
