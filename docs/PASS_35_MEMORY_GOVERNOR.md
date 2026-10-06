# Build 044 / Pass 35 — Memory Governor

Pass 35 extends the post-launch browser optimization line after Battery Governor, Thermal Governor, Frame Pacer and Render Optimizer.

## Delivered package

- Runtime/package version: `0.41.0-memory-governor-p044`
- Full website ZIP: `REBORN-PASS-35-MEMORY-GOVERNOR-FULL-WEBSITE.zip`
- Standalone ZIP: `REBORN-PASS-35-MEMORY-GOVERNOR-Standalone.zip`

## Runtime changes in the local package

- Adds a local memory/render-pressure score to the `/play/` frame pacing path.
- Adds `normal`, `trim`, `protect` and `recovery` memory modes.
- Mobile/low-memory pressure can lower frame caps before hard stutter.
- Dense desktop scenes can trim cadence before they stutter visibly.
- Weather/rain overlay cadence now also honors `releaseMemoryFxDivider`.
- `REBORN.snapshot().release` exposes `memoryGovernor`, `memoryScore`, `memoryMode`, `memoryCooldownFrames`, `memoryFxDivider` and `memoryDroppedFrames`.
- New in-game Memory Governor overlay opens with `M` or the `MEMORY` button and exports a local JSON report.
- New public route: `/memory-governor/`.

## Checksums

```text
95d2cf607a9a61c96dcab7a26235ae8c7557be43f1e5077b8f8dbd38b77261e2  REBORN-PASS-35-MEMORY-GOVERNOR-FULL-WEBSITE.zip
a39985b70d8668676ef5ad2eb89abf4d495bd8ad69af4b7f1fdc3e1a406205f9  REBORN-PASS-35-MEMORY-GOVERNOR-Standalone.zip
```

## Verification summary

Local package verification passed route inclusion, manifest/checklist inclusion, runtime patch markers, release metadata, service-worker cache marker, cached Memory Governor script, Launch Check integration, standalone inclusion and JS syntax.

## Limits

The package was not deployed. The work does not claim physical-device memory, FPS, battery, thermal, accessibility, legal, or storefront certification.
