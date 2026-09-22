# North Berwick driver-eye realism — Build 009

Build 009 keeps REBORN's fixed-step simulation, input paths, story progression, activities,
and save keys intact while replacing the first North Berwick visual pass with a more
recognizable driver-eye reconstruction.

## Delivered in this pass

- Oriented building frames derived from source footprint geometry rather than axis-aligned boxes.
- Road-facing facade estimation from the nearest named Maine E911 road.
- Procedural New England houses with foundations, clapboard-style palettes, gable/hip roofs,
  windows, doors, porches, chimneys, mailboxes, and roadside detail tiers.
- Authored landmark structures for Town Office/Police, Cumberland Farms, Fire Department,
  Hurd Manor, Olde Woolen Mill, Allard's Market, Mary Hurd Academy, Hannaford,
  Pratt & Whitney, Noble High School, and Riverside Farm Stand.
- Parking lots, gas canopy/pumps, fire-bay doors, mill tower/smokestack, school and industrial
  wings, farm greenhouses, sidewalks, crosswalks, road paint, practical street lighting,
  layered vegetation, utility poles, and wire silhouettes.
- A lower, closer chase camera and named-road UI retained from the prior pass.
- A WebP facade atlas built from openly licensed Wikimedia Commons photographs, with per-image
  authorship, licensing, dates, and source pages retained in `facades-atlas.json`.

## Measured verification

- All ten inline JavaScript blocks pass `node --check`.
- `npm test` passes the static gameplay and North Berwick realism assertions.
- `npm run validate:assets` validates the licensed MkIV vehicle asset and owner overlay identity.
- `npm run build` creates a complete static `dist/` including the facade atlas and attribution.
- A local HTTP read verified the HTML, world JSON, facade manifest, and WebP atlas.

## Fidelity boundary

This is a substantial visual reconstruction, not a survey-grade digital twin. Road alignment,
road names, source footprint placement, water/forest/farm context, and selected landmark facade
references are source-grounded. Non-hero private residences, modern commercial dimensions,
parking arrangements, building heights, utility placement, vegetation, and many roadside props
remain authored or procedural approximations. Owner/local visual acceptance is still required.
