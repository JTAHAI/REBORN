# Driver Experience polish — 0.9.1 / Build 012

## Scope

Presentation and navigation upgrade to REBORN's existing game. This does not advance the eight-pass gameplay roadmap or change town geography, vehicle geometry, story progression, fixed-step dynamics or the four activities. No remote font, image service, account, map API or runtime dependency was added.

The garage uses warm amber activity cards, a local-save indicator and a vehicle summary. Instruments have readable panel backplates, full/minimal modes, high contrast, persistent critical warnings and optional first-drive guidance. The existing Jetta status, diagnostic, parts, town-ledger and journal features are grouped into four keyboard-accessible tabs.

The paused road map supports public-landmark/road search, one pin, mouse/touch panning, pinch/scroll/keyboard zoom, My Car, Whole Town and Clear Pin. The minimap has its own zoom level. A destination shows straight-line distance and absolute bearing, explicitly not a driving route. Pins are session-only and cleared when switching worlds.

Preferences migrate within `995.reborn.save.v1`; `995.reborn.story.v1` remains unchanged. Instrument units change speed, coolant temperature, garage odometer and destination distance. Historical journal records retain miles, as disclosed in settings. Audio volume remains subordinate to the existing sound toggle. Export Save Backup downloads validated vehicle/town and story progress; there is no import UI in this release.

Touch uses a left joystick for all four arrow-key directions, with boost, drift, camera and conditionally available pulse on the right. Transform remains separate. No automatic acceleration was added. Portrait mode retains the landscape rotation guard. Dialogs block background interaction, trap keyboard focus and respect their return destinations.

## Maintainable source

- `src/driver-ux.js`: presentation/navigation controller embedded inside the existing application scope.
- `src/driver-ux.css`: final style layer, preserving existing control IDs.
- `tools/sync-town.cjs`: synchronizes those sources and the Town Director into the standalone `index.html`.
- `npm run build`: produces the static distributable without a new runtime framework.

## Validation and limits

Measured checks include preference migration/sanitization, source embedding, unchanged input/save identity, desktop dialog and map flows, garage layout at five viewport sizes, Jetta hub layout at four landscape sizes, touch-emulated pointer input and rotation guarding. Existing gameplay, story-boundary, pause/resume, world-rendering and asset checks remain separate regression gates.

Browser emulation is not physical iOS/Android certification. Fullscreen, wake lock and audio activation remain subject to browser policy. The art pass does not certify real-world architectural fidelity or owner acceptance of the Jetta. Those require the owner's visual review. Existing town/vehicle assets and the immutable Build 004 checkpoint are not altered.

### Measured local checks — September 25, 2026

- `npm test`: passed, including two deterministic 100-day Town Director runs, save migration and UX invariants.
- `npm run build`, `tests/town-packaging.cjs`: passed; 20 inline scripts compiled across source/distribution, unique IDs, byte-identical entrypoints.
- Garage layout: passed at 1366×900, 1264×569, 1024×600, 844×390 and 390×844.
- `tests/driver-ux-browser.cjs`: passed hub tabs, keyboard dismissal, persisted preferences, paused searchable/pinned map and four landscape hub layouts.
- `tests/driver-touch-browser.cjs`: passed touch-emulated stationary spawn, seven non-overlapping primary controls, stick acceleration/release, minimap pause, focus loop, recovery and portrait guard. The harness leaves fullscreen before requesting a desktop-window portrait resize; native fullscreen resizing is not treated as a game-input failure.
- Existing story Escape, driving settings and recovery browser checks: passed. Recovery checked at 1366×900 and 844×390.
- Controls/readability invariants, nine driving-behavior checks, vehicle-shell acceptance, asset validation and HTTP/private-file isolation: passed.
- Browser screenshots inspected for the garage, Jetta hub, settings, road HUD and pinned town map. Runtime error collection was empty in the tested flows.

Visual review exposed and corrected compact-menu overlap, inaccessible scrolled settings actions and overlapping map labels. Those observations are evidence of the tested layouts, not a claim of complete device coverage or owner acceptance.
