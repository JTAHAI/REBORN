# Build 020 / Pass 11 — Recovery integrity

Build 020 preserves the complete Build 019 game while adding a bounded local
interrupted-session journal. During an active drive or replay, one checkpoint per
tab is refreshed approximately every three seconds. A successful normal page exit
removes it. A process, renderer or tab interruption leaves it for explicit review.

The garage recovery card shows the newest checkpoint, its road/world, odometer and
age. The player may download the standard `REBORN_BACKUP_V1` file, restore it to
the garage, or keep the currently stored game and discard the checkpoint. Recovery
never runs automatically and does not claim to resume the exact physical road
position. At most three records younger than seven days are retained. The primary
store is localStorage; sessionStorage is only a best-effort fallback when the
browser refuses the primary write.

Every record includes a fingerprint of the stored save/story pair from which it
began. Direct restore is disabled if the stored pair later changes. The existing
single-writer guard performs its own byte comparison before writing and retains an
exact raw pre-restore copy. A second game tab remains playable and exportable but
cannot use emergency recovery to bypass session-only save protection.

The manual checkpoint/export controls are appended to the paused settings panel,
so the established keyboard entry point remains the first ordinary setting. When
save protection is active, the visible protected-session export remains the first
focus target. This preserves the existing desktop and touch focus-loop contract
while keeping recovery controls reachable at the end of the same dialog.

Graphics context loss now stops all WebGL update/render calls until restoration.
Invalid pre-loss GPU handles are abandoned instead of deleted through a lost
context. Resources are rebuilt under a new generation and recovery is announced
only after a complete frame renders. A bounded timer fails closed to the existing
local export/restart controls. Replays and active drives remain paused.

The previous Build 019 delivery workflow piped the browser test through `tee`
without `pipefail`, allowing a failing browser process to produce a successful job.
Build 020 workflows use `set -euo pipefail`; failed browser acceptance blocks
packaging. Native `WEBGL_lose_context` delivery is recorded independently from the
deterministic production-event test because software WebGL runners do not always
deliver the extension event.

No save identity, fixed-step simulation, input path, story progression, activity,
canonical North Berwick geometry, MkIV model, license or runtime backend changes.
No cloud save, account or telemetry. Browser storage remains evictable; downloaded
backups remain the durable copy. Physical-device crash/GPU certification remains
separate from Chromium software-renderer acceptance.
