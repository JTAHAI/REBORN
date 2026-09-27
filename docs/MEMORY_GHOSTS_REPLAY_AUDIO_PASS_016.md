# Build 016 — Memory ghosts, replay, and diagnostic audio (gameplay Pass 7)

Pass 7 lets the Jetta remember an actual player drive without sending location or
telemetry anywhere. Eligible North Berwick Free Drives create a compact record in
the existing version-1 local save. That record can be followed as a route ghost,
viewed as a cinematic replay, and used to reproduce mechanical audio clues that
were present during the drive.

## Player-facing flow

1. Enable **Record eligible Free Drives** in **J → Drive Memories**.
2. Drive North Berwick in Free Drive and return to the garage.
3. Open Drive Memories to inspect the route preview, distance, speed, temperature,
   battery minimum, sample count, marker count and whether a mechanical cue was
   captured.
4. Choose **Run Ghost** to drive alongside the spectral Jetta. `G` pauses/resumes;
   `Shift+G` or the HUD Stop button ends it. The recorded route is also drawn on
   the minimap and expanded map.
5. Choose **Watch Replay** for chase, roadside, orbit and driver cameras. Space
   pauses, C changes camera, the slider seeks, and the speed control cycles
   0.5×, 1× and 2×.

Recording and replay are excluded while a passenger commitment or Echo Roads
memory drive is active. They do not create a fifth activity or race mode.

## Persisted bounded state

The save key remains `995.reborn.save.v1`. The new `memories` record is sanitized
and bounded to:

- 5 completed recordings;
- 720 compact telemetry samples per recording;
- 48 route/event markers per recording;
- 40 history records;
- 180 route-preview points;
- one recoverable unfinished recording;
- five diagnostic severity channels.

Long drives are adaptively downsampled by doubling the sample interval while
retaining bounded state. Non-finite values, malformed samples, duplicate IDs,
impossible locations, oversized arrays and unknown history types are rejected or
clamped during migration. Out-of-order or duplicate timestamps are rejected;
multi-revolution headings are normalized rather than flattened. Older saves receive defaults without losing vehicle,
town, weather, passengers, Echo Roads, journals or service history.

After an interrupted session, a meaningful unfinished drive is archived as its
own memory and journal entry before a new Free Drive starts. It is not joined
to the fresh spawn, and it does not teleport the live car. Disabling recording
also retains the meaningful capture made so far. Recovery/teleport breaks are
recorded explicitly and survive downsampling, so previews and playback do not
invent a cross-town connection. Ordinary trip distance is counted once.
Recovered entries use zero for unavailable fuel/body-loss measurements rather
than inventing them. The library is a rolling five-recording store; use the
existing save export before older drives roll out.

## Captured data

Each compact sample contains local elapsed time, X/Z position, heading, speed,
throttle, brake, engine temperature, battery state and severity for:

- wheel bearing;
- charging system;
- cooling system;
- clutch;
- brake hydraulics / low brake condition.

The recorder also retains road transitions and bounded warnings or remembered
moments. Completed recordings link back to the corresponding Road Journal entry.

## Route ghost

The ghost is deliberately lightweight: project-authored translucent geometry,
a bounded trailing route, interpolation between samples and no collision or
competitive score. It loops until stopped, never alters vehicle condition and
cannot start during an active passenger or Echo Roads commitment.

## Cinematic replay

Replay temporarily places the existing Jetta on the recorded route, freezes the
Living Car simulation, and restores the prior world, activity, car pose, camera,
engine temperature and battery afterward. Sampled temperature and battery are
read-only replay telemetry; they never replace the live vehicle or its saved
condition, even when the tab is closed during playback. Simulation and active
trip clocks do not advance in replay. It provides four camera styles,
timeline seeking, playback speed, pause/play and keyboard focus containment.
Replay is local presentation against the current town scenery, not a full
recording of past traffic, weather, or NPC state, a video export, or a claim of
film-quality cinematography. Roadside shots use a stationary camera anchor.
Finished playback can restart; background tabs pause and mute it. Escape from
the timeline also exits and restores hub focus.

## Diagnostic audio

Existing mechanical fault severity drives bounded synthesized Web Audio nodes:

- bearing hum follows speed and lateral load;
- charging whine follows speed and electrical/engine load;
- cooling strain follows temperature;
- clutch rasp follows load and speed;
- brake squeal follows braking, speed and brake condition.

The feature uses no microphone, downloaded recording, generated speech,
commercial music or runtime audio service. It can be disabled independently.
The sounds are diagnostic gameplay cues, not laboratory acoustic models.

## Packaging and privacy

The complete memorial website, `/play/` game and embedded standalone ZIP are
built from the same commit. Application-cache migration never clears localStorage.
No route leaves the browser; no account, server, telemetry, live map API or cloud
database is introduced.

## Verification contract

Pass 7 acceptance covers:

- version-1 save migration and malformed-state sanitation;
- bounded long-drive downsampling and recording-library eviction;
- route interpolation, angle wrap and stable replay seeking;
- Road Journal linkage and marker bounds;
- ghost start/pause/resume/stop and map rendering;
- replay state isolation, cameras, speed, seek, focus and full restoration;
- diagnostic audio creation, bounded levels and disable behavior;
- passenger/Echo Roads conflict protection;
- desktop and touch-emulated layout;
- prior Pass 1–6 regressions, offline operation and historical-cache upgrade;
- unchanged canonical North Berwick world, MkIV GLB and immutable Build 004.

Browser automation is engineering acceptance, not physical-phone certification or
owner visual approval. The focused suite contains 33 production core/adapter/audio checks, including
200 generated journeys. Browser assertions separately exercise a short actual
manual-throttle recording, touch controls, save isolation and timeline focus.
Final balancing, performance tiers, accessibility review,
real-device testing and release hardening remain Pass 8.

**Pass 7 of 8 complete after verification. One gameplay pass remains.**

## Recovered validation and workshop integration

The checkpoint probe recorded 1 FPS software WebGL while both the simulation and
recorder advanced together from 4.00 to 15.325 seconds over the 120-second wait.
The page remained visible, focused and in play, with no JavaScript exceptions.
The previous 16-second assertion conflated rendering speed and driving-clock
progress; it was not evidence that the recorder stopped after key release.

Browser acceptance now retains a genuine manually accelerated short recording,
checks continued coasting progress against the simulation clock, archives it, and
uses that same real recording for ghost and replay tests. A separate production
recorder test verifies more than 16 simulated seconds in slow-frame partitions
and pause behavior. No physics clock, save threshold, or recording duration is
artificially advanced by the browser test.

Replay starts paused, making camera/seek controls usable even for very short
recordings. Deletion requires confirmation. The new lightweight recorder snapshot
reports phase, eligibility, duration, sample count, distance and simulation time.
The failure handler writes diagnostics before the browser context closes.

The optional red AEM driveway recollection and quiet garage callbacks are covered
by `WORKSHOP_DRIVEWAY_MEMORY.md`. Hub headings are task-specific; their opaque
sticky wrapper keeps text from showing through. Portrait menus no longer have the
driving orientation guard over the Workshop. The duplicated touch map shortcut is
hidden while the minimap retains its tap-to-open behavior.

These are focused U0/U1 recovery and usability changes, not completion of the
entire UX roadmap or Pass 8 performance and accessibility acceptance.
