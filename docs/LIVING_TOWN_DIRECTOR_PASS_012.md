# Build 012 — Living Town Director

Pass 3 of 8; package `0.9.0-town-director-p012`. Started from main `0ac73e71b15bb7aefbdc2216df6b41c103ecb4aa`. Local execution was explicitly authorized after the original cloud-only prompt. Pass 4 is not included; 5 passes remain.

## Implemented path

North Berwick Free Drive → seeded time/schedules → road-derived incident and actor placement → visible culled primitive props → F/contextual touch choices → vehicle/trust/state consequences → journal and Town Ledger → existing local save. No runtime API or server is involved.

`src/town-director.js` is the tested state/placement/actor system; `src/town-ui.js` integrates the existing application. `tools/sync-town.cjs` mechanically embeds these files in the standalone `index.html` during build. Edit these sources, then run the synchronizer. This preserves the existing static monolith without a framework or dependency.

31 definitions cover mechanical trouble, debris, utility hazards, works, water, animals, response scenes, school/community congestion, directions, detours and earned return assistance. Each supplies schedule, weather eligibility, duration, risk, representation, choices and follow-up type. Eight schedule bands are fictional. One real second advances one town minute by default, only during active North Berwick Free Drive. No offline advancement or reseeding on reload.

Explicit incident states: scheduled, active, acknowledged, player-helping, assistance-called, temporarily-stabilized, resolved, failed, expired-with-consequence. Helping requires remaining within 45 m for eight town minutes; calls resolve after fifteen and warnings after ten. Battery help consumes eight percentage points, coolant help six; help also consumes 0.2% fuel and raises temperature 2°C. Existing faults remain. Unsafe withdrawal has no trust penalty. Safe completion gives gradual trust; unfinished accepted help or striking a hazard reduces it. Trust/support history enables later supplies once per stable event ID.

Reduced lanes expire and appear on both maps. These are not complete road closures: opposite access remains open. Nearby throttle is moderated; driving into the marked road-edge hazard may damage tires/alignment. Other modes do not run town incidents or traffic.

Town Ledger appears in Jetta Status alongside the existing diagnostics, road journal and repair history. Choices use F, Tab, Enter, Escape or touch. Menus pause the town; choices save immediately. Event changes save once per batch; the existing eight-second driving flush saves clock/traffic. No per-frame writes or menu rebuilding.

## Migration and bounds

Storage key `995.reborn.save.v1` and save version 1 are unchanged. Missing town data receives neutral trust 50 and deterministic defaults. Sanitation rejects non-finite or malformed positions, unknown types/states, duplicate IDs and invalid routes; it clamps clock/trust/stats and reconstructs closure authority from incidents. Reload revalidates against road geometry, water and oriented building footprints. Corrupt locations are discarded, not executed. Existing Living Car/road/garage data remains intact.

Hard limits: 6 incidents, 12 actors, 96 history records, 256 compact resolved records, 48 consequences, 6 reduced lanes, 8 route segments, 18 shared journal records. Slot high-water marks prevent replay even after resolved records age out. Actors have bounded speeds, spacing checks, finite routes and sixty-town-minute lifetimes. Traffic ends at unsupported graph connections rather than wandering. Grid indexes are built once; there is no per-frame scan of all buildings. Logic is 2 Hz, actors 10 Hz, rendering culled at 320/280 m with a bounded primitive count.

## Measured validation

Baseline and final commands: `npm test`, `npm run validate:assets`, `npm run build`, `npm run test:http`, `node tests/controls-acceptance.cjs`, `node tests/driving-behavior.cjs`, `node tests/readability-acceptance.cjs`, `node tests/vehicle-shell-acceptance.cjs`.

`tests/town-director.cjs` executes the production module, migration, malformed imports, duplicate rejection, same/different seeds, reload stability, clock bands/pause, trust/vehicle costs, abandonment, safety withdrawal, closure cleanup, collision consequences, all 31 real-world placement categories, finite actors, both asset hashes, inline syntax and unique HTML IDs. Two independent deterministic 100-day runs assert equivalent finite bounded state daily, including filled 96/256 history/resolution caps and serialized town state below 200 KB. This is a synthetic engineering soak, not a mobile frame-rate or town-fidelity certification.

Browser verification uses a dedicated test session. `tests/town-browser-fixture.js` installs a road-validated incident 3.3 m from the normal Market Street start through localStorage and reload, never a production teleport/debug mutation API. It tests F → choice menu → Enter → battery cost → completion → trust/ledger → reload. Real browser captures distinguish gameplay visibility from architectural accuracy.

Measured run: two 100-day simulations completed in about 11.3 seconds on the validation host while the browser was open; maximum daily-sampled town serialization was 55,467 bytes, with 8 actors and 5 incidents at sampled endpoints (hard limits are checked independently). Completed browser help increased trust from 50 to 52 and survived reload. The choice-menu clock remained exactly unchanged over a one-second observation. Free Drive, Harbor Run, Pursuit, Arena and Story all entered play with no frame errors; town time remained unchanged in the other activities. M and minimap clicking opened the paused map. The contextual touch-layout button opened the scrollable choice panel at 844×390; this was browser layout emulation, not a physical-device acceptance test. Production-input handler tests verify manual ArrowUp/W throttle and zero stick throttle on pointer release, cancellation and lost capture. Twenty inline scripts across source/dist compiled and both HTML documents had unique IDs.

Both source and dist inline scripts must compile, HTML IDs remain unique, legacy stays untouched, and `git diff --check` must pass. World renderer regression measures 35,721 finite objects and 5,760 sunroof vertices within 1–5 mm of the unchanged GLB roof.

## Asset checksums (starting and ending identical)

World SHA-256: `8588954fcc6ed3c88a7336c89ea36e65213a7561e8c7a9dfdb7ad3bb7c4d0b52`

MkIV GLB SHA-256: `ac9f1d907807e5cdb0cb02beeb676f2f4ebe6c53f363d5fec3cbe183604d2e3f`

No world regeneration, car fitment changes, personal photos, external vehicle model imports, telemetry or separate-project content. Deployment ZIP contains dist contents at root; exact commit, ZIP hash and measured run results are recorded in the delivery PR.

## Limitations / owner review

Generic box-based traffic and roadside props are inexpensive visual proxies. Lane following is deliberately simple: no traffic signals, advanced routing, towing or real agency dispatch. Incident choice descriptions are fictional gameplay, not roadside safety training. All lane restrictions retain passage. Support consequences provide future dialogue/passenger hooks; Pass 5 dialogue is not implemented. Current rain eligibility reads the existing weather setting; Pass 4 weather/surfaces are not implemented. Balancing, real-device mobile performance, visual fidelity and owner acceptance remain provisional.
