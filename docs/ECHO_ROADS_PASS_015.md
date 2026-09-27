# Build 015 — Echo Roads (gameplay Pass 6)

Echo Roads is a six-place, unhurried North Berwick memory drive. It layers an
imagined 1999½ interpretation over the same mapped streets and landmark shells.
It does not create a racing grid, alter the Jetta, or replace passenger stories.

## Playable loop

Open J → Echo Roads and begin. Follow the numbered copper map markers. Slow below
6 mph near a marker for 1.5 seconds to notice the present view. V, or the contextual
touch button, blends into the earlier interpretation over 2.4 simulation seconds.
Notice that view too, then return to the notebook and choose **Keep the place**,
**Keep the feeling**, or **Leave it unspoken**. All choices are equally valid; no
trust reward, XP, collectible boost or race score is attached. Six reflections
and a return to Today complete the homecoming. There is no deadline.

The six places are Town Hall/Police, Cumberland Farms, Fire Department, Olde
Woolen Mill, Hurd Manor, and Allard’s. Waypoints use the maintained building
frontage road, not the nearest unrelated street to a landmark pin. When nearby
observation circles overlap, the selected destination takes priority. Discovery
points also avoid the production collision hulls; Canal Street uses a safe
position beside the mill rather than a point inside its broad collision box.

## Interpretation, not a historical survey

Today retains the current source reconstruction. Earlier street furniture,
facade colors, furnishings, generic traffic details, prose and sound are authored
memory cues. These are **not verified claims about what existed at a North Berwick
address in 1999**. The notebook and HUD state this explicitly. No real private
residents, commercial recordings, or scraped street imagery are introduced.

The prototype includes a paper noticeboard, imagined payphone and paper map,
equipment rack and bell, mill loading crates, porch details, and canvas awning /
newspaper boxes. Existing nearby facade materials blend toward warmer finishes;
road geometry, physical building shells, collision geometry, and the Jetta do
not shift. Civilian traffic gets restrained earlier-style paint and chrome
accents; its paths, collisions and schedules remain the existing Town Director.
This is generic period dressing, not an authenticated historical vehicle fleet.

Outside the downtown memory corridor, the visual influence fades out. The
optional original soundscape uses three reusable Web Audio oscillators with a
low-pass filter and subtle pitch movement. It respects sound, volume, pause and
the separate memory-audio switch. No runtime audio download is required.

## Persistence and lifecycle

The storage key remains `995.reborn.save.v1`. Its bounded `echoes` record contains
active view/transition, six discovery records, six reflection choices, focus,
resumable road position, elapsed simulation time, distance and completion.
Unknown identifiers, incomplete comparisons with forged choices, non-finite
values and unsuitable resume positions are discarded or bounded. Ending a drive
clears the visual layer but keeps the notebook. Repeating a completed place does
not append another reflection or grant rewards. Completion is recorded once.

Map, hub, paused game and blocking menus freeze progression and transitions.
Reduced motion switches the interpretation without an animated transition.
A passenger commitment blocks a memory-drive launch. A memory drive must end
before taking a passenger. Story, Harbor Run, Pursuit and Arena do not activate
Echo Roads. The authored layer never rewinds the town clock, services the car,
erases weather accumulation or resolves an unrelated roadside incident.

Reflection and homecoming entries use the existing bounded Road Journal.
Reload restores the chosen view, destination, position and previous comparisons.

## Implementation and limits

Maintained sources: `src/echo-roads.js`, `src/echo-roads-ui.js`, and
`src/echo-roads-ui.css`. The existing bundler embeds them into the static game.

- 6 authored landmarks; no growing per-road memory database
- at most 32 history slots (six unique reflections in this chapter)
- 12 queued adapter events
- 220 maximum decorative objects; cached local batches and 250 m culling
- per-world cached placement validation; no per-frame building scan
- three audio oscillators, created once and reused
- facade tags assigned once during world construction
- decorative placements reject road lanes and mapped water

## Verification

`node tests/echo-roads.cjs` runs the production core and canonical town. It covers
32 checks including old-save migration, malformed state, maintained frontage
projection, slow observation, both-view gating, pause, reduced motion, mode and
passenger isolation, one-time reflections, the homecoming, reload, local fade,
finite road-safe props, unchanged geometry, journal persistence, and two identical
300-loop reload/end/resume simulations.

`npm run test:echo:browser` serves the full packaged website and exercises notebook
access, first launch, current/earlier rendering, paused clocks, saved-position
resume, every comparison/reflection and the ending, quiet audio shutdown,
passenger conflict, and touch control separation. Position fixtures shorten
travel, but observation, transition and response logic are production code and
actual UI. The browser lifecycle uses a 1024×600 battery-saver viewport and
bounded waits for real simulation time, with separate desktop/phone layout
checks. Shared software-rendering runners are not an FPS benchmark. This is not a claim of manual full-route or physical-phone acceptance.

Prior gameplay, map, owner-car, desktop/touch UX, passenger, weather, offline and
cached-Build009 upgrade tests remain release gates. The local browser in the
editing environment is policy-blocked; browser acceptance runs in the repository’s
isolated GitHub Actions test environment. No production site is contacted.

## Deliberate limits

This is the scoped two-era **prototype**, not a surveyed 1999 town restoration.
There is no lip-sync, original historical speech, multi-era building demolition,
fully modeled period fleet, photogrammetry, or new collision topology. Map hints
are destination bearings, not a new navigation-routing engine. Owner review,
physical-device performance and final artistic balance remain open. Original
memory-ghost replay and expanded mechanical audio belong to Pass 7.

## Packaging / count

`npm run package:site` creates the full memorial website and a byte-matching
standalone download from the same source commit. Historical release archives
remain unchanged. A pushed PR is not a production deployment.

**Pass 6 of 8 after release verification: 2 gameplay passes remaining.**
