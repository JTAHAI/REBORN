# Build 013 — Maine weather and road surfaces (gameplay Pass 4)

Based on `863dfdb8d475c2714c1702c387bc9abf464f8b2e`, preserving Pass 3,
modern driving UX and the production repair tooling. No production deployment
or merge of the existing branches is performed by this pass.

## Implemented loop

A local seeded forecast evolves on the existing paused town clock. Four seasons
cycle every 30 in-game days. Fronts change every three town hours. Clear,
overcast, rain, heavy rain, fog, frost, snow, sleet, freezing rain and thaw are
available; Settings also offers explicit fixed-kind scenarios for inspection.
Selecting a scenario deliberately resets surface conditions and is identified
as a scenario, not a natural weather transition. Wipers can be disabled.

Named-road zones retain wetness, puddles, snow, packed snow, slush, ice, leaves,
salt, snowbank coverage and the last treatment slot. Moisture freezes below
freezing, snow melts, slush/refreeze persists, and salt moderates freezing.
Priority corridors receive an abstract municipal treatment schedule; visible
snowplow actors represent the service, not individual simulation of every blade.
Drainage, shade and treatment priorities are seeded **gameplay heuristics**, not
surveyed North Berwick measurements or real agency schedules.

Production vehicle simulation applies separate bounded grip, braking, traction,
steering-response and rolling-resistance factors. These combine with existing
tire/brake/component condition, rather than replacing diagnostics. Standing
water risk increases with speed and poor tires; there are no random forced spins.
Ambient temperature and electrical demand feed existing Living Car behavior.
Other activities preserve their legacy lighting and dynamics; climate time and
surface evolution run only in active North Berwick Free Drive.

The Town Director gates flooding/plow incidents on weather context, slows ambient
traffic and supplies bounded plow actors. Learned hazards are recorded only after
actual movement, shown in the Living Town hub and drawn on maps for six town
hours. They are observations, not omniscient or guaranteed-current warnings.

Rendering adds depth fog, cloud/diurnal lighting, road wetness, restrained snow
coverage, nearby surface/bank props, snow/rain/sleet effects and cockpit wipers.
Particles/wipers respect reduced motion and pause. This is a stylized surface
simulation, not photogrammetry or photorealism.

## Persistence and bounds

The existing `995.reborn.save.v1` key and version remain. Optional `climate`
state migrates without deleting town, vehicle, fault, repair or road histories.
Unknown/non-finite values and prototype keys are rejected. Only real road names
survive binding. Limits: 256 zones (146 in this world), 160 observed-road records,
32 weather/service entries and 144 nearby dynamic props. Weather advances in
five-town-minute ticks. Loaded catch-up is capped to one simulated day; there is
no wall-clock/offline advancement. Collections are bounded and spatial road
queries avoid per-frame scans of buildings. Render dressing is cached by movement
cell and weather revision. Weather save writes reuse existing event-driven and
throttled persistence.

## Full website consolidation

`website/` and `website-game-shell/` maintain the memorial source previously
buried in the c1d56e5 release archive. Historical release ZIPs remain unchanged.
The current tested game is packaged under `/play/` with its dedication, licenses,
credits and a matching standalone download. The root memorial website has no
root service worker; the game worker owns only its scope. It precaches a complete
version before activation, serves version-consistent files, and cleans only its
own legacy namespace. The updater never clears localStorage or unrelated caches.
Unversioned world/model files require revalidation rather than immutable caching.

Commands (Node and Python 3 standard library for packaging):

```sh
npm run build:site
npm run test:site
npm run package:site
```

Set `REBORN_SOURCE_SHA` to an exact commit when building an exported tree; a normal
git checkout resolves HEAD. Outputs: `site-dist/`, `standalone-dist/`, `packages/`.
No command deploys or edits the existing Workers Static Assets configuration.

## Verification contract

`tests/maine-weather.cjs` executes the production Core and real town roads:
27 behavioral tests cover migrations, bounds, determinism, pause, reload,
precipitation coherence, drainage, freeze/thaw, salt/plow slots, surface friction,
real braking/traction, observations, props and Town Director integration. Two
100-day runs compare identical finite state, with reloads every ten days.

Existing gameplay, town, controls, vehicle and world regressions remain required.
`tests/website-package.py` verifies local links, source/game hashes, both release
forms, dedication uniqueness, deployment roots and ZIP contents. Browser tests
execute five weather scenarios, map/hub, drive observations, persistence and mode
isolation. Website browser acceptance covers the full homepage and game, the
matching download, offline reload and upgrade from the real historical Build009
cache without clearing saves or other apps' caches.

The optional Playwright transport runs the existing UX assertions unchanged.
`REBORN_BROWSER_DRIVER=playwright` requires a test-only Python Playwright install
and `REBORN_CHROMIUM` executable. `REBORN_BROWSER_LOW=1` selects the real battery-
saver renderer in isolated fixtures for software-GPU CI, not as a shipped default.
A browser transport timeout or administrator block is a failure/blocker, not a pass.
Physical-device mobile performance, final balancing and owner visual acceptance
remain unverified. Measured run evidence is separate from these limitations.

## Unchanged anchors

- World SHA-256: `8588954fcc6ed3c88a7336c89ea36e65213a7561e8c7a9dfdb7ad3bb7c4d0b52`
- MkIV SHA-256: `ac9f1d907807e5cdb0cb02beeb676f2f4ebe6c53f363d5fec3cbe183604d2e3f`
- Legacy SHA-256: `5ef42f30b501362aa82432b7575d90a928396639cdd672d61d2ae6f8f6caeb4f`

No Grand Prix content, runtime API, telemetry, new backend or personal reference
photos are introduced. **Pass 4 of 8; 4 gameplay passes remain after verification.**
