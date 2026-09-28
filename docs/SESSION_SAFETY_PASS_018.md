# Build 018 — Session save safety (Pass 9)

This is the first post-milestone pass, following the completed eight-pass prototype.
Baseline: `9d5e6d926edfdf93ec8cf2b46812089ef5f44cdc`.
Version: `0.15.0-session-safety-p018`. Status remains playable pre-alpha.

## Defects addressed

Build 017's `persist()` wrote its in-memory pair without checking whether another
tab had changed the stored pair. A stale tab could undo a restore/newer drive on
its next settings write, autosave or pagehide. The new browser regression includes
the exact Build 017 runtime as a negative fixture and exercises its real settings
handler, not only a mock of storage.

The property expression `localStorage` was evaluated before entering the previous
write helper, so a getter-level SecurityError could escape. Normal backup export
also sanitized the last `save` object without first capturing the current recorder
and director state. Restore prepared its recovery copy with a persist first and
could replace a prior recovery copy even when the restore failed.

## New behavior

A named browser Web Lock gives one cooperating Build 018 tab permission to save.
Other tabs still drive, inspect, read and export, but are session-only. They do not
queue for automatic ownership, steal the lock, or regain write permission when
the owner disappears. Close other game tabs and explicitly reload the stored game
to start a new saving session. Pagehide releases ownership after the existing final
save attempt; BFCache pageshow reacquisition rechecks stored bytes first.

Every attempted save/restore also checks the exact two raw values loaded or last
written by that session. An external change or deletion latches save protection.
It does not silently adopt a different car into the current live simulation. The
status remains until a reload. Unrelated keys and sessionStorage are ignored.

Save controls live in the scrollable paused menu, not over driving controls:

- Export this session: capture current directors/recorder into a valid backup
  without writing it over stored progress.
- Export stored originals: export the exact raw pair currently in storage,
  including corrupt strings or absent records.
- Reload stored game: explicit confirmation; removes the old pagehide writer so
  it cannot undo the loaded record. Export first to retain unsaved RAM progress.

The top-level save label identifies session-only operation. Restore and RESET are
blocked in non-writing tabs, including programmatically dispatched click events.
An owning tab may deliberately restore a corrupt original, preserving its raw
bytes in the pre-restore copy. A failed restore attempts to roll back the recovery
copy as well as successfully changed save keys. Rollback never knowingly overwrites
a new value written by another client. Partial recovery failure is reported rather
than labeled saved. No extra persistent game keys were introduced.

The nested dedication's stale Build 014 product description now says Build 018.
License text, required attribution, car/world bytes and the optional Workshop story
are unchanged. Chrome redirect-safe loading, the repair page and explicit idle
service-worker update consent are retained.

## Bounds and limitations

Web Locks coordinate cooperating modern clients on this origin. An old version,
an extension, or external script does not honor the new lock. Raw-pair checks are
additional protection, not a filesystem/database transaction. If Web Locks is
absent, a single tab can still save with stale-pair checks; do not run concurrent
saving tabs in that fallback mode. Failure to acquire a present lock API does not
silently degrade into an unlocked writer. Denied initial storage reads stay
session-only until reload, rather than treating unread data as an empty save.

Browser storage can be removed by browser settings, eviction, private-session
closure or external software. A local export is the independent backup. There is
no cloud save, telemetry, server, new domain or hosting configuration.

## Verification requirements

- `npm test`: retained pure suites plus 22 session-save checks.
- `npm run test:session:browser`: baseline loss, real-tab ownership, session
  export, restore/reset rejection, close/reload, legacy mutation, getter denial,
  quota rollback, no-lock fallback and corrupt-original recovery.
- Retained navigation, all-tab update, full-site packaging, release UX, controls,
  recordings/replay, Workshop, weather, passengers and Echo regression gates.
- Two deterministic full-site/standalone rebuilds and canonical asset checks.

Fault injection is confined to isolated test browser contexts. Software-rendered
Chromium and touch emulation are not physical-phone/FPS certification. Passing
checks do not establish commercial readiness, final handling, or owner visual
acceptance. Failed gates block the dependent packaging job; production is not
changed by this pass.

## Browser-platform references

Web Locks ownership/lifetime and optional `ifAvailable` request:
https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request

Other-document storage events and the absence of localStorage transaction locks:
https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
https://html.spec.whatwg.org/multipage/webstorage.html
