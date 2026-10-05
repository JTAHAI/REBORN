# Build 042 / Pass 33 — Thermal Governor

Runtime/package version: `0.39.0-thermal-governor-p042`.

This records the Pass 33 local packaging pass and deliverable metadata in GitHub. The deployable ZIP artifacts remain in the ChatGPT artifact bundle rather than being committed as large binary blobs.

## Actual game changes in the delivered package

- Mobile Auto quality now has an adaptive thermal score above Frame Pacer.
- Sustained frame jitter, skipped-frame pressure and high mobile canvas load can move the game through `cool`, `watch`, `steady` and `protect` modes.
- Mobile stress caps can step down to 30 FPS and then 26 FPS under sustained pressure.
- Desktop heavy scenes gain a gentler thermal guard at 46 FPS when pressure persists.
- Graphics recovery still uses a conservative 20 FPS cap.
- `REBORN.snapshot().release` exposes `thermalGovernor`, `thermalScore`, `thermalMode`, `thermalCooldownFrames` and `thermalDroppedFrames`.
- New in-game Thermal Governor overlay opens with `H` or the `THERMAL` button and exports a local JSON report.
- New public route: `/thermal-governor/`.

## Checksums

```text
62534b8f22f5e45ffa97fca286a25262481cd1859e1a9e3dc5eaee8e98fd7ac1  REBORN-PASS-33-THERMAL-GOVERNOR-FULL-WEBSITE.zip
d0fedf8523f05bcbea1f6d0662ea7ddd8217277317d3ad1c78a8568120fda53c  REBORN-PASS-33-THERMAL-GOVERNOR-Standalone.zip
```

## Limits

This was a local static packaging pass. It was not deployed. It is not physical-device FPS certification, thermal certification, accessibility certification, legal review, storefront approval or storefront submission.
