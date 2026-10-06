# Build 043 / Pass 34 — Battery Governor

Branch: `chatgpt/reborn-pass34-battery-governor`
Runtime/package version: `0.40.0-battery-governor-p043`

This pass continues graphics optimization after Thermal Governor by adding idle-aware frame pacing and local battery/idle diagnostics.

## Delivered package changes

- Adds `/battery-governor/` public route.
- Adds `play/battery-governor.js` in-game overlay.
- Press `B` or the `BATTERY` button to export a local JSON report.
- The delivered game runtime tracks `batteryGovernor`, `batteryIdleSeconds`, `batteryIdleMode`, `batteryIdleFrameCap`, `batteryIdleFxDivider` and `batteryIdleDroppedFrames` in `REBORN.snapshot().release`.
- While the car is stopped and controls are idle, the render frame cap steps down and weather/rain overlay iteration is reduced.
- Nothing is uploaded. No telemetry, backend, account, cloud save, ads or microtransactions were added.

## Package artifacts

```text
3a891099b4ed781a8fe565335c6b20942f48925cae5349123d09624d2c512b9f  REBORN-PASS-34-BATTERY-GOVERNOR-FULL-WEBSITE.zip
280fef205b5b95a947267726a501cc7d3751ebbc4b0ffe4994be28010d728e0b  REBORN-PASS-34-BATTERY-GOVERNOR-Standalone.zip
```

## Local verification

20 local package checks passed, including route inclusion, manifest/checklist inclusion, runtime version, battery runtime patch markers, release-snapshot fields, service-worker cache marker, cached battery-governor script, launch-check integration, standalone inclusion and JS syntax.

## Limits

This was a local static packaging pass. It was not deployed. It is not physical-device battery certification, FPS certification, thermal certification, accessibility certification, legal review, storefront approval or storefront submission. The deployable ZIPs are delivered through ChatGPT artifacts rather than committed as large binary blobs.
