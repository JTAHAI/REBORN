# Render Optimizer Checklist

Build 040 / Pass 31. Manual checks only; this is not physical-device FPS certification.

1. Open `/launch-check/` and confirm the build is `0.37.0-render-optimizer-p040`.
2. Start `/play/`, enter Free Drive, press `Y` or the RENDER button.
3. Confirm the report shows renderOptimizer `shadow-bloom-scheduler-v1`.
4. On desktop, confirm the render tier is desktop and the pixel budget is above the mobile budget.
5. On a phone or touch emulator, confirm the render tier is mobile and canvas pixels stay below the desktop budget.
6. Try Golden Hour and Midnight Rain. Confirm FPS and draw calls remain reportable.
7. Trigger Photo Mode or Feedback Kit only by local export. No telemetry is expected.
8. Close/reopen the game and confirm the repaired offline loader still serves `/play/`.
