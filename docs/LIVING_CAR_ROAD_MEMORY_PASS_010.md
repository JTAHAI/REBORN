# Build 010 — Living Car and Road Memory

This is gameplay pass 1 of 8 for the next REBORN development sequence.

## Implemented

- persistent fuel, battery, engine temperature, tires, brakes, oil, coolant, body condition and odometer;
- condition-sensitive acceleration, grip, braking and fuel starvation;
- gradual wear based on distance, load, drifting, hard braking, weather and temperature;
- system warnings for low fuel, overheat, worn tires/brakes, and charging problems;
- named-road familiarity accumulated from actual North Berwick driving;
- road-memory milestones and map emphasis for roads the player learns;
- persistent drive journal with route, mileage, time, road count, maximum speed and condition changes;
- garage refuel/charge and full-service actions without erasing odometer or history;
- a dedicated Jetta Status / Road Journal interface, accessible with `J` or menu/HUD controls.

The existing save key remains unchanged and older version-1 saves migrate in place.

## Project boundary

No Grand Prix product identity, rivals, race-grid logic, networking UI, alternate vehicles, parody content or course progression is included. This system was designed specifically around REBORN's single persistent Jetta and North Berwick Free Drive.
