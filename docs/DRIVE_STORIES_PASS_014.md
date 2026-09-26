# Build 014 — Drive stories and passengers (gameplay Pass 5)

Pass 5 turns a North Berwick trip into a story scene without stopping the drive. It adds three complete fictional passenger journeys, persistent relationships, route-sensitive commitments, explicit silence choices, and consequences recorded alongside the Jetta’s mechanical and town history.

## Player-facing journeys

### The Long Way Home

Pick Mara up near Allard’s and bring her toward Hurd Manor. She asks the player not to pass the Olde Woolen Mill. The game remembers the named roads actually driven, whether the Canal Street mill corridor was entered, driving smoothness, and the player’s dialogue—or deliberate silence.

### The Last Part Before Closing

Pick Eli up near Cumberland Farms, collect a fictional relay near Allard’s, and complete a handoff at Riverside Farm Stand. The player can promise to protect the car, promise to make the fictional time window, or make no promise. Hard braking, body damage, unsafe low-grip driving, five minutes of active driving time, and whether the player actually eases off after a cooling-care promise determine whether that commitment was honored.

### First Snow

Pick Nora up near Mary Hurd Academy and drive toward Noble High School in accumulating snow. The player can commit to the treated main roads or cautiously accept a shortcut. The story checks the real named-road route, winter grip, hard braking, damage, and a fictional roadside-hazard decision.

All passengers, conversations, personal circumstances, schedules, and roadside situations are fictional. Public landmarks are navigation anchors only; the game does not portray real private residents or claim current operating hours.

## Persistent state

The existing `995.reborn.save.v1` key remains unchanged. Pass 5 adds a bounded `journeys` record with:

- ordered completion state for three passenger drives;
- one resumable active drive;
- relationship trust, rides, kept promises, broken promises, and meaningful silences;
- bounded outcome and choice histories;
- current commitment, route evidence, measured drive metrics, and last position;
- completion/abandonment statistics.

Existing version-1 saves migrate in place. Malformed values, unknown stories/prompts, non-finite numbers, oversized collections, invalid positions, and out-of-order completion records are rejected or bounded.

## Driving integration

Passenger drives run only in North Berwick Free Drive. They do not add a separate racing mode and do not replace Story, Harbor Run, Pursuit, or Breaker Yard.

The active drive contributes:

- a passenger objective and map/waypoint marker;
- compact in-car dialogue that does not pause vehicle simulation;
- three numbered response choices usable by keyboard or touch;
- silence as both a visible choice and the automatic answer when the response window expires;
- route and driving measurements from the fixed-step simulation;
- weather scenarios selected through the existing deterministic Maine-weather system;
- cooling-care commitments measured against actual throttle and temperature, without inventing an instant repair;
- a once-only Town Trust response to Nora’s slippery-road report;
- a permanent passenger-drive entry in the Road Journal;
- relationship outcomes in the Jetta Hub’s new Passenger Drives tab.

Returning to the garage while a passenger commitment is active opens a confirmation dialog. Keeping the drive returns to the previous paused state. Cancelling before pickup or arranging onward transport when the Jetta is mechanically unsafe does not penalize trust. Otherwise, ending the commitment costs two trust points. Reloading preserves the passenger, location, unanswered question, and original response deadline.

The initial question appears immediately upon boarding. Final arrival does not skip the second question. Completion requires every intermediate stop, both questions, a stopped car within the destination radius, and any goodbye wait. Choices continue to use the driving clock; map, hub, pause and confirmation screens freeze it. The relay clock measures simulation seconds rather than accelerated fictional town minutes.

Starting an authored scenario may advance the town clock, but never rewinds it. The previous weather preference is restored after completion or abandonment; road conditions already accumulated during the drive are not magically erased. Passenger feedback on broken route promises, hard braking, poor grip, heat and damage is bounded rather than repeated every frame.

## Bounds

- 3 story definitions
- 3 fictional passengers
- 1 active drive
- 64 relationship/outcome history entries
- 96 dialogue-choice records
- 48 unique roads retained per active drive
- 16 queued UI events

No runtime account, server, map API, telemetry, live dialogue service, or cloud database is introduced.

## Controls

- Garage **Passenger Drives** or `J` → **Passenger Drives**: choose or resume a journey
- `1`, `2`, or `3`: choose a passenger response
- Touch: select one of the three contextual response buttons
- Letting the timer expire: choose the explicit silence response
- `J`: open the Jetta Hub and Passenger Drives tab
- `M` / minimap tap: paused map
- `F`: Living Town roadside interaction
- `E`: existing Reborn pulse

## Verification contract

Pass 5 acceptance covers save migration/sanitation, story ordering, landmark-to-road projection, route promises, driving-measure consequences, silence, reload/resume, bounded history, journal migration, browser dialogue flow, existing controls, all prior Pass 1–4 regressions, full-site packaging, offline/cache migration, and unchanged canonical assets.

Tests execute the production core against the real world. The focused suite covers 28 behavior checks and a 200-journey bounded-state simulation. Packaged browser tests separately cover all three endings with explicitly identified saved-position fixtures; these are lifecycle checks, not claimed manual full-route recordings. Existing desktop/touch, weather, offline and historical-cache tests remain release gates.

The canonical North Berwick `world.json`, MkIV GLB, and immutable Build 004 checkpoint are not modified by this pass.

## Limitations

Dialogue is text-first and authored, not generated at runtime. Destination hints are bearings/markers, not newly implemented turn-by-turn routing. Slippery-road calls and onward transport are fictional story outcomes, not a full dispatch simulation. The three drives are a playable chapter, not an entire finished campaign. Passenger expressions, lip sync, cinematic character models, advanced voice acting, final narrative balancing, physical-phone acceptance, photorealism, and owner acceptance remain outside this pass.

**Pass 5 of 8 complete after verification. Three gameplay passes remain.**
