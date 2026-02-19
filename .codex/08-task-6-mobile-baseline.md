# Task 6 Dossier: Mobile Baseline (Core Screens)

## Objective
Make Chain View, Habits, Calendar/day view, and Settings usable on phone without structural rewrites.

## In Scope
- responsive layout constraints on core screens
- tap target and spacing fixes
- lightweight interaction performance checks

## Out of Scope
- complete visual redesign
- non-core module UX polish

## Do Not Touch
- page routing architecture
- unrelated desktop-only modules

## UX Constraints
- no horizontal scrolling on target screens
- tap targets >= 40px practical minimum
- sticky bottom action area allowed for primary actions
- avoid dense table layouts on mobile (prefer stacked cards)

## Performance Constraints
- no long tasks in chain step interactions
- minimize re-renders for checklist toggles

## PWA Baseline Notes
- keep manifest and install flow intact
- reuse habits offline queue pattern when extending queue behavior

## Acceptance Checks
1. Chain view checkbox and gate toggles usable on phone.
2. Habits logging usable with no overflow.
3. Settings actionable on small viewport.
4. Core screens readable and tappable without zooming.
