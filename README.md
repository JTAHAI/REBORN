# 99½ REBORN

Browser-first WebGL2 driving-game reconstruction of a customized 1999½ Mk IV sedan.

## Play online

The live game is available at [reborn.tahai.net](https://reborn.tahai.net).

## Run

```powershell
npm start
```

Open `http://127.0.0.1:4173`. Build 004 has been preserved unchanged in `legacy/`.

## Current source status

The supplied material contained the verified Build 004 standalone but not its original extracted source archive. The runnable working copy is `index.html`; the project structure, asset registry, and static build tooling are being established without modifying the legacy checkpoint.

## North Berwick Free Drive

Free Drive uses the locally bundled v2 `assets/worlds/north-berwick/world.json` for North Berwick, Maine. It includes named public Maine E911 road centerlines, Maine ESCB footprints, landmark anchors, and an OpenStreetMap-derived water/woods/farmland context, with no runtime GIS/API calls. The HUD reports the current named road; `M` (or a minimap tap) opens the named-road town map. Visible attribution includes: “North Berwick geographic data: Maine GeoLibrary / Maine ESCB” and “© OpenStreetMap contributors” for the additional context.

See [`assets/worlds/north-berwick/CREDITS.md`](assets/worlds/north-berwick/CREDITS.md) and the retained [`provenance.json`](assets/worlds/north-berwick/provenance.json) for sources and transformations. Centerlines and footprint placement are data-derived; road widths and building heights are gameplay/visual heuristics.

On touch devices, the landscape left stick is a four-way equivalent of the keyboard arrow keys: up accelerates, down brakes/reverses, and left/right steer. It does not auto-throttle.
