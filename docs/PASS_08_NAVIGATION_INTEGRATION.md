# Pass 8 navigation repair integration

Build 017 / Pass 8 of 8, starting from a7641ebe5fc1fc52f7ba96ce9ca2062ae31cafa9.
Imports the navigation repair from d0dd8466cb3d9f659cbccc31ad25138d9270ca73.

## Player-visible result

The completed Hometown UX pass now includes the repaired offline loader. All
four hub sections, road-profile guidance, larger reading options, save backup
and restore safeguards, quieter HUD and rendering improvements remain intact.
A redirect from /play/index.html to /play/ must no longer make a cached
navigation fail with Chrome ERR_FAILED.

The repair normalizes redirected HTML on cache installation and cached reads.
Online loading also survives unavailable cache storage or failed cache writes.
Cleanup recognizes both historical game-scope cache name formats, but leaves
unrelated/root caches and player saves alone. /repair/ is outside the game scope
and restarts only the game loader; it never clears progress or memories.

Crucially, the Pass 7 repair's automatic skipWaiting is NOT carried over.
Pass 8 retains explicit consent and its all-game-tabs-idle activation gate.
The two-version active/idle update regression now serves the same HTML redirect
as the production static host. The original failing worker is retained as a
negative fixture; it must reproduce ERR_FAILED before the new worker is tested.

No gameplay runtime, canonical North Berwick data, MkIV model, input mapping,
save key, license, dedication or hosting configuration changes in this integration.
The existing Pass 8 runtime changes remain those documented in
RELEASE_HARDENING_PASS_017.md. This is still a playable pre-alpha, not a claim
of physical-phone performance, owner visual acceptance or commercial readiness.

## Required checks

- npm test (prior gameplay, 20 release-hardening checks, 11 loader unit checks)
- npm run test:navigation:browser (old failure, idle recovery, offline URLs,
  redirected cache read, repair page, standalone scope, desktop/touch driving)
- npm run test:updates:browser (real two-version/two-tab idle-consent fixture,
  now including index.html redirects)
- Existing release, UX, memory, workshop, weather, passenger, Echo and site gates
- Exact website/standalone byte equivalence, canonical asset hashes and repeat build

Browser tests run on the CI Chromium software renderer with touch emulation.
A local browser-policy block is an environment failure, not a game verdict.
Any unsuccessful required CI gate prevents the dependent package job.
Main and production are not deployed by these source, test or package commands.
