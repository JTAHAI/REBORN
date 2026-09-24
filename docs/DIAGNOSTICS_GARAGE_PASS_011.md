# Build 011 — Diagnostics and Hands-On Garage

This is gameplay pass 2 of 8 for REBORN. Six passes remain after this build.

## Implemented

- persistent component condition for the alternator, cooling system, starter, clutch, wheel bearing, alignment and brake hydraulics;
- persistent fault states that begin as symptoms and remain unidentified until a relevant test confirms them;
- visual, charging/crank, cooling-pressure, chassis-road, brake-pedal and drivetrain-load diagnostic tests;
- fault effects on battery charging, coolant loss, engine temperature, acceleration, grip, braking and steering pull;
- temporary roadside triage for electrical reserve, coolant, tire pressure, brake pressure, safe shutdown and limp mode;
- garage repair choices between rebuilding/preserving an original component and replacing it for maximum condition;
- component originality tracking, rebuild/replacement counts and condition bars;
- a permanent garage history ledger for tests, roadside work, routine service, rebuilds and replacements;
- routine service no longer silently erases diagnosed component faults.

## Migration

The existing `995.reborn.save.v1` key and save version remain unchanged. Pass 1 saves gain validated default component, fault, diagnostic and service-history records in place.

## Project boundary

No Grand Prix branding, rivals, race-grid systems, course progression, alternate vehicles, networking UI or parody content is included. The mechanics are built specifically around REBORN's one persistent Mk IV and its history.
