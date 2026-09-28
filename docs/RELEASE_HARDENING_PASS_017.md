# Build 017 — Hometown UX and release hardening

Gameplay engineering Pass 8 of 8. Baseline: `3957339883932f0ed4c3bc9657ae4118aa8def29`.
Version: `0.14.0-hometown-ux-p017`. A milestone is counted complete only after its
acceptance gates pass and its full website and standalone packages are produced.

## Scope delivered

### A navigable Jetta Hub

Four primary destinations group existing task panels without discarding them:
Drive (passenger journeys / Echo Roads), Jetta (condition / workshop), Town
(living-town ledger / map), and Journal (road journal / Drive Memories).
Narrow menus use a labeled native section selector; secondary tabs remain
keyboard navigable. Contextual headings, visible focus and return behavior stay.
The campaign and four original activities remain in the garage. Continue labels
reflect active passenger or Echo commitments. Actual town-loading readiness and
retry replace a potentially misleading fallback-world launch.

### Road-view priorities

Passenger objectives are displayed once. The HUD gives touch controls, minimap,
instruments, weather, highest-priority mechanical warning and context choices
separate regions. Multiple mechanical warnings collapse to one urgent message
with an additional-warning count; full details remain in Jetta status. Ordinary
notifications queue (maximum eight) behind conversation rather than stacking over
choices. This is a bounded priority implementation, not a general cinematic UI
framework. Existing pulse and transformation mechanics are not removed.

Reading size supports 100%, 125%, 150% and 200%. The optional passenger reading
pause freezes vehicle, town, weather and response time together. Small landscape
screens below 740px and text above 125% also use this fair reading hold. Choices
remain scrollable and usable rather than timing out while offscreen. Mechanical
sound captions supplement synthesized diagnostic audio. These controls are not
an accessibility certification or proof of every possible assistive-device flow.

### Routes along the town roads

A derived graph uses canonical road segments, endpoint joins and precise T-junction
connections. Crossing lines are not blindly joined, avoiding fabricated bridge
connections. Direct, Cautious and Familiar preferences alter route costs based on
length, current simulated surfaces/reduced lanes and recorded road familiarity.
Paths and next-named-road guidance are shown; off-route indication requests
recalculation. The router never mutates world.json. Queries are bounded to 12,000
input roads and 30,000 visited nodes. The current town graph has 1,090 nodes.

These are **static game-road paths**. They do not implement live traffic, legal
turn restrictions, real-world driveway access, surveyed safer roads, ETA or full
lane-level turn navigation. They terminate at a mapped road approach to a landmark.
A distant/disconnected location has an explicit pin/bearing fallback, never a
fake straight line labeled as a road route. The Town map can be opened from the
hub without starting a drive or advancing the paused simulation.

### Saved-state and update safety

The original save and story storage keys remain unchanged. Paired writes retain
old values and roll back after a write failure; rollback failure is explicitly
reported. This is best-effort localStorage recovery, not a filesystem transaction.
A malformed stored original is preserved and exportable. It is not silently
replaced by defaults during autosave. A valid session can still be exported.

Restore accepts the known REBORN backup format and save version, with a 4 MiB file
limit and existing data sanitation. Preview and explicit confirmation precede
replacement. The pre-restore raw pair is copied under
`995.reborn.before-restore.v1`, with an export action. Replacement reload avoids
the old pagehide writer overwriting the restored pair. Reset requires typing
RESET and offers backup export first. A prior restore copy is overwritten by the
next explicit restore; it is not unlimited history or remote backup.

A replacement service worker caches the complete installation but waits. Explicit
Save and Update asks all game-scope tabs whether they are idle. Busy or unresponsive
tabs block activation. The legacy homepage bridge similarly waits for old game
tabs to close. Cache deletion remains restricted to the worker's own scope, and
application updates never clear localStorage. Website content and worker-template
changes contribute to the content tag. The game remains usable offline after a
complete installation; no runtime map API, account or server was added.

### Rendering work

Static objects are indexed into 128m cells with radius-aware queries; large/hero
objects are retained safely. North Berwick candidate ranges are 300m in the existing
battery-saver mode and 510m otherwise, rather than a misplaced city-coordinate
rule drawing distant town objects. Per-mesh instance staging arrays and GPU buffers
are reused until capacity must grow. Replaced world graphics resources are deleted.
Menus render at up to 20Hz; active driving/replay render at up to 60Hz; hidden pages
do not render. Driving still uses the original fixed-step simulation.

The first packaged-browser sample considered 5,603 of 35,721 static objects at one
viewpoint. This measures candidate work, not a universal frame-rate multiplier.
No physical-phone or named desktop GPU frame-rate target is claimed. Distant
scenery/LOD and final draw-distance preferences still need owner review.

## Canonical preservation

- `world.json`: `8588954fcc6ed3c88a7336c89ea36e65213a7561e8c7a9dfdb7ad3bb7c4d0b52`
- MkIV GLB: `ac9f1d907807e5cdb0cb02beeb676f2f4ebe6c53f363d5fec3cbe183604d2e3f`
- Immutable Build 004 checkpoint unchanged.
- Passes 1–7, original activities, fixed-step physics, manual touch throttle and
  existing control keys remain. No Grand Prix content is imported.
- The optional red AEM driveway story remains unchanged: all choices succeed,
  no timer/puzzle/repair gate, normal vocabulary by default and optional stronger
  language. Justin's latest note does not introduce more explicit dialogue.

## Acceptance contract

Run all prior core, control, asset, weather, passenger, Echo, recording, workshop
and packaged-site tests, plus:

```
node tests/release-hardening.cjs
npm run test:release:browser
npm run test:updates:browser
```

The 20 pure checks cover old saves, known backup formats, bounds, write rollback,
warning priority, spatial-query coverage, continuous mapped routes, T junctions,
bridge separation, disconnect fallback, profiles, all 15 canonical landmarks,
worker activation rules and immutable assets. Browser checks use the actual
packaged website, visible navigation, input and production state transitions.
Fixtures are labeled saved-position/state fixtures, not claimed manual playthroughs.

The layout matrix covers 640×360, 844×390, 1024×600, 1366×768, 1920×1080 and
390×844 menus, plus 100/150/200% reading sizes. Combined phone cases include a
passenger choice, low fuel, weather, objective and touch controls. Storage cases
include invalid/cancelled/confirmed restores, corruption and reset confirmation.
Update checks stage two complete versions at one test origin, proving live-tab
blocking, explicit idle activation, saved-car preservation and offline replacement.

Browser tests run in Chromium software WebGL. Physical devices, complete controller
remapping, screen-reader certification, voiced navigation, final balancing and owner
visual acceptance remain separate. Any failed gate blocks release packaging.

## Packaging and delivery

`npm run package:site` produces the complete memorial website (root index.html,
current /play/, matching embedded standalone ZIP) and separate standalone ZIP.
`npm run test:site` checks local links, IDs, versions, asset checksums and matching
standalone contents. `REBORN_SOURCE_SHA` permits an exact commit to be supplied
when building an exported checkout without Git history. SHA-256 accompanies delivery.

Source is checkpointed to an integration branch **before** slow browser gates, so
failed conversations cannot discard the work. Verification groups run independently.
A failed group cannot publish release packages. Main and production are not changed
by these build/test/package commands; merging and deployment remain separate actions.

After verified and packaged Build 017: **0 planned engineering passes remaining**.
This completes the defined eight-pass prototype milestone, not an open-ended promise
of commercial release readiness or completion of every item in the broader UX plan.
