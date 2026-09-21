# North Berwick Free Drive world

`world.json` is a static, local game asset generated on 2026-09-21 for 99½ REBORN.
It contains North Berwick, Maine road centerlines and building footprints transformed
to local metres. It contains no residential address fields and makes no runtime GIS
or map-service request.

Visible attribution: **North Berwick geographic data: Maine GeoLibrary / Maine ESCB.**

## Source roles

- Maine E911 Roads FeatureServer — Maine Emergency Services Communication Bureau / Maine GeoLibrary
- Municipal boundary and building footprints — Maine ESCB

`provenance.json` retains the exact build-time source URLs, transformations, timestamp,
and record counts. Road widths are gameplay heuristics. Building placement is based on
the supplied footprints, while building heights are procedural approximations.
