# Alternate Grand Prix upgrade merge

This pass reviewed the uploaded `Carpooling to Hell's Arcade: The Procedural Grand Prix` prototype and selectively moved its useful game systems into **99½ REBORN**.

## Retained upgrades

- a visible North Berwick road course generated from the static town road network;
- nine named landmark gates and turn-by-turn HUD guidance;
- five local AI rivals, race position, countdown and rival tags;
- scoring, combos, drafting, overtakes, drift bonuses, boost pads and recoverable hazards;
- Jetta tune, paint and bot-difficulty configuration;
- rollover/recovery behavior and richer arcade feedback;
- progressive boot status, fullscreen handling, wake lock, haptics, install prompt and offline PWA cache.

## REBORN constraints preserved

- **Free Drive remains the default and canonical North Berwick mode.**
- Desktop acceleration still requires `W` or `ArrowUp`.
- The mobile stick mirrors all four keyboard arrows; releasing it releases throttle.
- Auto-throttle remains optional and defaults off.
- `M` opens the paused map, and tapping the minimap does the same on touch devices.
- The owner-correct gloss-black Mk IV, fitted sunroof, Maine chickadee plate `9855 MD`, tire fitment and current town-center corrections remain authoritative.
- Runtime remains static/front-end-only with no account, game server, map API or cloud backend.

## Deliberately not exposed

The alternate prototype's parody finale, talking-head spectators, experimental ATV/hood selections and manual direct-link networking are not part of the stable public surface. Solo racing is the only exposed grid mode pending separate networking qualification.
