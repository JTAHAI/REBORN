# The red intake, the driveway, the language

Justin recalled installing his red AEM cold-air intake alone in the driveway, with
one mounting point underneath the engine and another on the other side. Aligning
them involved a great deal of swearing and is funny to remember afterward.

This optional Workshop recollection adapts those facts. Dialogue and punchlines
are dramatized, not a transcript. It does not claim an exact installation date,
part number, fastening sequence, or mechanically accurate installation procedure.
It does not fit a new intake to the persistent vehicle or change engine output.

## UX contract

Three short scenes, all choices successful, no timer, skill check, money, wear,
trust reward, or repair gate. Close at any point or skip directly to the finish.
Mild dialogue is the default; stronger sailor vocabulary is explicitly opt-in for
this story. Completion enables quiet, independently switchable garage callbacks.
Replaying the anecdote never creates a reward-farming loop or growing history.

The save adds four bounded fields under `workshopMemories` while keeping the
existing version-one key and all vehicle/town/relationship/recording state.

This checkpoint also gives existing hub sections task-specific headings and the
recording panel an explicit status. It is not a claim that the entire proposed
four-section UX redesign, navigation routing, or Pass 8 hardening is finished.

## Verification

`node tests/workshop-memories.cjs`: ten behavior checks, every dialogue path,
malformed saves, skip parity, preference persistence and zero mechanical effects.

`npm run test:workshop:browser`: real click/tap flows, language setting, skipping,
closing, unchanged live state, reload and three touch viewport sizes.

Browser verification is a release gate; a source checkpoint is not a release.

The recollection collapses to a compact entry when it is not being played, so
ordinary diagnostics stay close. Language and attribution context live in a
keyboard-accessible details section. Callbacks remain outside that collapsed
section and do not interrupt the driving view or force the user to read them.
