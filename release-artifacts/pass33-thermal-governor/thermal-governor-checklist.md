# 99½ REBORN — Thermal Governor Checklist

Build 042 / Pass 33 adds an adaptive thermal governor above the Frame Pacer.

## Desktop quick loop

1. Open `/play/?build=f33thermal42`.
2. Start Free Drive and press `H`.
3. Confirm the report shows `thermalGovernor: true`, frame cap, jitter and skipped-frame counters.
4. Drive a dense road scene and export the JSON report.

## Mobile quick loop

1. Open the game in landscape.
2. Drive for several minutes in Auto quality.
3. Open Thermal Governor with the THERMAL button.
4. Confirm mode moves through cool/watch/steady/protect only when the browser is under stress.

## Limits

This checklist is manual. It is not physical-device thermal certification, FPS certification or storefront approval.
