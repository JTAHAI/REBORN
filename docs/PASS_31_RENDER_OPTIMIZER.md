# Build 040 / Pass 31 — Render Optimizer

This pass continues the desktop/mobile graphics optimization work after the local Pass 30 Visual Upgrade package.

## Actual renderer changes

- Runtime version: `0.37.0-render-optimizer-p040`.
- Mobile render budgets are tighter: lower DPR caps and smaller canvas pixel budget to reduce heat and stutter.
- Desktop high/auto budgets are wider to preserve cleaner road scenes.
- North Berwick visual range is narrower on mobile/low and wider on desktop.
- Per-mesh instance budgets are stricter on mobile while preserving hero/studio/fx-critical objects.
- Reflection-probe updates are cadence-limited on mobile.
- Shadow-map passes are skipped on mobile auto/low and scheduled on mobile high.
- Bloom passes are skipped when bloom is disabled and scheduled on mobile.
- Diagnostics expose `renderOptimizer`, `shadowCadence`, `bloomCadence`, `probeCadence`, and `optimizedDrawCallsSaved`.

## New public route

`/render-optimizer/` documents the pass and provides a manual desktop/mobile checklist.

## In-game tool

`play/render-optimizer.js` adds a local-only Render Optimizer overlay. Press `Y` or the `RENDER` button while driving to copy or download a JSON report. No telemetry or backend is used.

## Package artifacts

The deliverable ZIPs are in the ChatGPT artifact bundle for this pass, not committed as Git blobs:

- `REBORN-PASS-31-RENDER-OPTIMIZER-FULL-WEBSITE.zip`
- `REBORN-PASS-31-RENDER-OPTIMIZER-Standalone.zip`

## Checksums

```text
ff1c48e019208fc162a5f798369e2e68451e07237303989bd46c9c12ec973400  REBORN-PASS-31-RENDER-OPTIMIZER-FULL-WEBSITE.zip
6fd615f8bc4795b36bcb97a0b750ea57746b17d49c30023698c234971f9914e0  REBORN-PASS-31-RENDER-OPTIMIZER-Standalone.zip
```

## Verification scope

Local package verification covered ZIP integrity, standalone presence, route inclusion, service-worker cache marker, new JS syntax, release metadata, and the renderer patch markers. This was a local packaging pass, not physical-device FPS certification.

## Limits

This is not physical-device FPS certification, thermal certification, accessibility certification, storefront approval, or a production deployment.
