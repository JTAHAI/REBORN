# Release packages

## Live map hotfix — 2026-09-25

The live site is a Cloudflare **Worker with static assets**, named `reborn`,
not a Pages project. Its memorial website and `/play/` game are a separate
release package from the newer root game/UX branch. Pushing that branch alone
does not deploy this website.

Production repair: ported `81d40040669b73129191fbc749974493a2cd052b` into the
packaged game and bumped its service-worker cache to
`build009-c1d56e58ac847d-mapfix-20260925`. Only `play/index.html` and `play/sw.js`
changed. The original archive and its historical downloadable game remain
unchanged; **do not redeploy the original ZIP without applying this repair**.

Root cause: `RebornRenderer.buildWorld()` referenced an undefined material enum
`M`. The initial Free Drive click threw `ReferenceError: M is not defined` after
switching the simulation world, so a second click started driving with no town
geometry. The repair binds the material enum and makes world switching atomic.
It also includes the tested road-aligned spawn and factory-roof sunroof fit.

Reproduce from a fresh extraction of the original ZIP into `live-map-site/`:

```powershell
node tools/repair-live-map.cjs release-packages/live-map-site --patch
npx wrangler deploy --dry-run --config release-packages/wrangler.live.jsonc
# Explicit production action, after browser verification:
npx wrangler deploy --config release-packages/wrangler.live.jsonc
```

`--check-live` compares all 40 public files against production byte-for-byte.
Before this repair the original package matched; afterward the patched package
matched. `_headers` and `_redirects` were separately checked against the active
Worker settings and retained. No bindings or custom-domain changes were made.

Measured validation: 11 inline scripts compile; the production renderer builds
35,659 finite scenery objects, a road-aligned spawn, and 5,760 sunroof vertices
within 1–5 mm of the GLB roof. Browser verification covers entering Free Drive
on the first click, visible roads/buildings, driving, map open/close, and the
service-worker update. This repairs rendering, not a new claim of town visual
fidelity or owner acceptance.

Deployed Worker version: `ac6e7072-5600-4fc4-8acd-bc6231046e52`.
Previous version (rollback reference): `ccad304f-c765-4810-a997-6fa22d260321`.
Patched game SHA-256:
`4e260b6d03307ebab3f76d038805dd94447b9a883f79bbba9bbe5d1b327adfdc`.

## Original archive — North Berwick + owner-correct Mk IV polish

- `reborn-cloudflare-pages-c1d56e5-NORTH-BERWICK-POLISHED.zip`
- Source/game commit: `c1d56e58ac847d054c84de5a2bb0f1b78bbd9a98`
- SHA-256: `c7e8027de259b4b7eb562eab52e8a1302ddbc5bb25663451ee3a9df20cd18438`
- Original packaging target: direct static upload (actual host: Workers static assets)
- Architecture: front-end only; no runtime map API or backend

The ZIP root is directly deployable and includes the polished memorial website, current game, local Mk IV model, static North Berwick world, attributed facade atlas, browser offline cache, and standalone game ZIP.

Archive features: map zoom, keyboard-equivalent mobile controls, glossy black paint,
period-correct Maine chickadee plate 9855 MD, and tire-only fitment refinement.
Rendering and sunroof issues in this archive require the hotfix above.
