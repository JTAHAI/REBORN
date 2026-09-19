# 99½ REBORN photoreal execution log

## Decision

The authorized workspace was empty. The only supplied runnable artifact is the verified Build 004 standalone, so it is preserved byte-for-byte under `legacy/` and copied into `index.html` as the temporary working source. This is not a claim that a monolithic HTML artifact is the long-term architecture; the original extracted source archive is still needed for a clean modular migration.

## Completed

- P0: preserved the supplied Build 004 standalone and matched its SHA-256 (`5ef42f30b501362aa82432b7575d90a928396639cdd672d61d2ae6f8f6caeb4f`).
- P0: established a local static server and reproducible `dist/` build command.
- P0: identified the existing WebGL2 hero vehicle path and its shared use by garage and gameplay.
- P1/P3: recalibrated the shared black-paint clearcoat response and roughness so studio strips remain legible without bleaching the body silver; strengthened the physical Mk IV-style grille cavity, frame, and six slats in the same `RebornVehicle.objects` path used while driving.
- P1: recorded the vehicle's provisional identity and unverified details separately from visual continuity requirements.
- P1: added a provenance-recorded, public-domain factory Mk IV multi-angle reference pack; used it to return the Street car's rocker, doors, rear quarter, trunk and outer rear-lamp treatment to factory-line proportions while retaining the owner-specific deep front fascia.
- P1: reviewed an exact-make online model listing, but did not acquire it: its $10 Editorial Only OBJ licence, missing UV map, and non-game-ready status make it unsuitable for direct integration without user approval and rework.
- P1: imported the user-provided `Volkswagen Bora/Jetta MK4 2005` GLB as the live factory body shell. The loader selects the canonical body/door/roof/hood/trunk/lamp/mirror components only, excluding the source model's alternate rusty, stance and V6 variants. Credit, source URL, CC BY 4.0 licence and SHA-256 are shipped in `assets/vehicles/jetta-mkiv/CREDITS.md` and linked visibly from the main menu.
- P1: added the owner-specific deep lower front fascia, mesh intake, lower lip, marker elements, paired-spoke wheels and plate as separate runtime overlays. The licensed source GLB is unmodified.

## Open issues

- The Build 004 source archive and editable Blender/glTF source are absent.
- Only front three-quarter owner photography is available. The owner-specific wheel, rear, side, interior, custom bumper close-ups, and dimensions remain unverified; the public-domain pack establishes factory-shell details only.
- Visual validation must be run on this Windows browser after startup; prior Linux/SwiftShader receipts are historical only.

## Commands

- `npm start`
- `npm run build`
- `npm test`
- `npm run test:http`

## This-session evidence

- Windows local HTTP and browser evidence verified Build 008 on the Windows in-app browser: the GLB loads without a graphics interruption; front and side inspection show the rounded A4/Mk IV roofline, four doors, short deck and factory rear-quarter body shape. The initial GLB refresh fault was corrected by rebuilding the WebGL targets after geometry registration.
- Not verified here: physical touch/controller, Safari, mobile thermal/frame-rate behavior, an authored glTF/Blender pipeline, or owner acceptance of exact visual fidelity.

## Next action

Obtain owner-car close-ups of the front kit and wheels, then refine the overlay dimensions/materials without modifying the licensed factory source. Recover the original extracted Build 004 source (or approve a modular extraction from `index.html`) before migrating the importer into `src/vehicle.js`.
