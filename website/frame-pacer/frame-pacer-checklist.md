# 99½ REBORN — Frame Pacer Checklist

Build 041 / Pass 32 adds adaptive desktop/mobile frame pacing on top of the Render Optimizer.

## Desktop loop

1. Open `/play/` on a desktop browser.
2. Start Free Drive and keep Rendering set to Adaptive.
3. Press `L` or the `FRAME` button.
4. Confirm the report shows `framePacer.enabled: true`, a desktop frame mode, canvas pixels, draw calls and no frame errors.
5. Drive through dense North Berwick roads and confirm the game remains responsive.

## Mobile loop

1. Open the game in landscape.
2. Confirm touch controls remain reachable.
3. Press/tap `FRAME` and save the report.
4. Confirm the report uses a mobile frame mode such as `mobile-balanced-40` or `mobile-clarity-48` when appropriate.
5. Compare with Performance Lab and Render Optimizer reports.

## Graphics recovery loop

1. Run Graphics Recovery or force WebGL interruption where supported.
2. Confirm Frame Pacer switches to the graphics recovery cap while the interruption is active.
3. Restart graphics if necessary, without clearing saves.

No report is uploaded by the site. This checklist is not physical-device FPS, thermal, accessibility, or storefront certification.
