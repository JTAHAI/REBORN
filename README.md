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
