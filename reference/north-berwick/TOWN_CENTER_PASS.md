# Town-center correction — 2026-09-22

Bounded address, position and frontage correction. This is **not** a completed photorealistic reconstruction or owner acceptance. Heights, roof shapes and site furniture remain provisional, pending the owner's street-level video.

## Evidence

- Cumberland Farms: [official 34 Main Street listing](https://www.cumberlandfarms.com/stores-directory/me/n-berwick/34-main-st/), [OSM footprint](https://www.openstreetmap.org/way/1016220532).
- Town Hall / Police: [official 21 Main Street address](https://www.townofnorthberwick.org/252/Town-Clerk), [OSM footprint](https://www.openstreetmap.org/way/1233206226).
- Aroma Joe's: [official 19 Main Street listing](https://aromajoes.com/who-we-are/locations/).
- North Berwick Crossing: [Dunkin's 23 Wells Street listing](https://locations.dunkindonuts.com/en/me/north-berwick), [OSM shared plaza footprint](https://www.openstreetmap.org/way/1016217421). Dunkin and Subway share this building, not separate parcels.
- Kennebunk Savings: [official 8 Main Street listing](https://www.kennebunksavings.com/location/).
- Post office: [36 Wells Street footprint and address](https://www.openstreetmap.org/way/1016216231).
- Fire station: owner-supplied 14 Market Street Street View, corroborated by the mapped fire-amenity location and aerial footprint. The OSM amenity's Main Street address disagrees and was not used.
- Plan-view reference: Esri World Imagery, extent -70.738,43.30315 to -70.733,43.30815. Used for site comparison only; no aerial imagery is shipped.
- Owner-supplied Google Street View screenshots: reference only; none copied into assets or dist.

## Relationships preserved

Cumberland Farms lies between Main Street (storefront / canopy) and Market Street (service/rear). Town Hall and Aroma Joe's face Main Street from the other side. William Hill Fire Station faces the rear of Cumberland across Market Street. Church Avenue leaves Main Street beside the town-center block and connects farther along to Burma Road; these source road names and centerlines are unchanged.

## Implementation and limits

`town-center-sites.json` records estimated dimensions and source evidence. `node tools/assets/compile-town-center.cjs` applies deterministic, offline site corrections to world.json. Authored frames are shared by rendering, collision and map footprints. Incorrect nearest-footprint landmark assignments are removed. Building details are modest geometric approximations, not scans or photo textures; exact storefront lettering, arches, landscaping, grades and driveway surfacing remain work for the video pass.

OpenStreetMap data: © OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright. Existing world credits remain applicable.
