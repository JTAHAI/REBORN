# Build 041 / Pass 32 — Frame Pacer

Build 041 adds adaptive desktop/mobile frame pacing on top of the Render Optimizer package.

The deployable ZIPs are in the ChatGPT artifact bundle for this pass, not committed as binary blobs.

## Runtime/package version

`0.38.0-frame-pacer-p041`

## Actual game changes in the delivered package

- Mobile Auto quality uses stepped 34 / 40 / 48 FPS frame caps as resolution scale changes.
- Desktop heavy scenes can pace at 52 / 56 FPS before returning to 60 FPS.
- Graphics interruption/recovery forces a conservative 20 FPS cap while active.
- `REBORN.snapshot().release` exposes `framePacer`, `frameCap`, `frameIntervalMs`, `frameMode`, `frameJitterMs`, `renderedFrames`, and `skippedRenderFrames`.
- New in-game Frame Pacer overlay opens with `L` or the `FRAME` button and exports a local JSON report.
- New public route: `/frame-pacer/`.

## Checksums

```text
1bf5eac2293bd889ab586331692b707d0eac5da3e4014cf489c99e59bbc39a2d  REBORN-PASS-32-FRAME-PACER-FULL-WEBSITE.zip
761bdd0f6b84252195abc18b3407e8ee7955e1964b4a2ae419ed7546fb130f1d  REBORN-PASS-32-FRAME-PACER-Standalone.zip
```

## Verification

Local package checks passed for route inclusion, manifest/checklist inclusion, runtime version, service-worker cache marker, cached frame-pacer script, launch-check integration, release metadata and HTTP smoke tests.

## Limits

This was a local static package pass. It was not deployed. It is not physical-device FPS certification, thermal certification, accessibility certification, legal review, storefront approval or storefront submission.
