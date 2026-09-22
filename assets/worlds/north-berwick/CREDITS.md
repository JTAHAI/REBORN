# North Berwick Free Drive world — Build 009

`world.json` is a static, local game asset for 99½ REBORN. It contains named
Maine E911 roads, Maine ESCB building footprints, selected landmark anchors, and
OpenStreetMap-derived water/woods/farmland context transformed to local metres.
It contains no residential address fields and makes no runtime GIS or map-service request.

Visible geographic attribution: **North Berwick geographic data: Maine GeoLibrary / Maine ESCB.**

Additional water, woods, and farmland context: **© OpenStreetMap contributors.**

## Build 009 driver-eye reconstruction

Build 009 adds oriented footprint massing, procedural New England houses, authored
landmark structures, sidewalks, crosswalks, street lighting, parking lots, utility
poles/wires, and an attributed facade atlas. Road alignment and source footprint
placement are data-derived. Unreferenced architecture, building heights, roofs, trees,
parking arrangements, utility placement, and roadside props remain visual approximations.

The authored landmark pass covers Town Office/Police, Cumberland Farms, Fire Department,
Hurd Manor, Olde Woolen Mill, Allard's Market, Mary Hurd Academy, Hannaford,
Pratt & Whitney, Noble High School, and Riverside Farm Stand. A named landmark model
should be treated as a recognizable game reconstruction, not a survey or digital twin.

## Source roles

- Maine E911 Roads FeatureServer — Maine Emergency Services Communication Bureau / Maine GeoLibrary
- Municipal boundary and building footprints — Maine ESCB
- Water, woods, and farmland context — OpenStreetMap contributors
- Town street-map cross-check — Town of North Berwick / CAI Technologies; reference only
- Facade reconstruction references — Wikimedia Commons files listed in `facades-atlas.json`

## Facade atlas licensing

`facades-atlas.webp` is a cropped and color-normalized derivative atlas assembled from
eight openly licensed Wikimedia Commons photographs. Exact source pages, authors, dates,
and licenses are recorded in `facades-atlas.json`. The combined atlas is distributed under
**CC BY-SA 4.0**, without changing the attribution or license obligations of any source image.

The in-game cells currently used for landmark facades include:

- North Berwick Town Hall — User:Magicpiano — CC BY-SA 4.0
- Mary R. Hurd House / Hurd Manor — Magicpiano — CC BY-SA 3.0
- Olde Woolen Mill — Kalki — CC BY-SA 4.0

The atlas also retains reference cells for the 1893 Commercial Block, North Berwick
National Bank, First Baptist Church, Hussey Company Museum, and J. L. Prescott House.
