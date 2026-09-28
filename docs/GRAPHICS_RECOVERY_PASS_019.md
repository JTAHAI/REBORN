# Build 019 / Pass 10 — Graphics recovery

Build 019 preserves the Build 018 save-safety and repaired offline loader while
hardening WebGL context loss. Active drives pause immediately. Playing Drive
Memory replays pause as well and remain paused after restoration, so no replay
time disappears behind a blank frame. Camera interpolation and the fixed-step
accumulator are reset after resource rebuild.

The renderer now tracks a graphics generation. Asynchronous facade-atlas image
callbacks created before context loss are discarded after a later generation,
preventing stale WebGL objects from being populated after restoration. Diagnostic
snapshots expose loss/recovery counts and the generation.

If automatic recovery fails, the fatal panel offers a current-session JSON export
before reload. The export remains local and uses the existing Build 018 backup
path; no account, telemetry or cloud save is added.

Acceptance uses the browser WEBGL_lose_context extension to cause an actual
context-loss/restoration cycle during a Free Drive and while a replay is playing.
It verifies frozen simulation/replay clocks, manual resume, generation rebuild,
and zero page errors. This is still software-WebGL CI rather than physical-device
GPU reset certification.
