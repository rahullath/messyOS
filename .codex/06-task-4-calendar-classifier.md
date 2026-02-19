# Task 4 Dossier: Calendar Classifier (Travel/Local/Soft)

## Objective
Classify calendar-derived anchors/events into travel/local/soft and keep chain generation stable except for classification effects.

## In Scope
- classification rules
- title prefix overrides
- mapping of local anchors to no-travel blocking behavior

## Out of Scope
- replacing calendar service architecture
- changing unrelated scheduler logic

## Do Not Touch
- proven chain timing semantics outside classification branch points

## Classifier Output
- `AnchorKind = 'travel' | 'local' | 'soft'`

## Rule Set
- if title contains `[TRAVEL]` -> travel
- if title contains `[LOCAL]` -> local
- if title contains `[SOFT]` -> soft
- else if location exists and not home -> travel
- else if location missing -> soft
- else if location contains "Home" -> local
- else if title contains local keywords (laundry/cooking/cleaning/study/admin) and no location -> local

## Behavior Expectations
- Travel anchor: full envelope (prep/travel there/anchor/travel back/recovery)
- Local anchor: blocks time, no travel blocks
- Soft anchor: non-mandatory behavior, no forced travel constraints

## File Touch Budget (Minimal)
- `src/lib/anchors/anchor-service.ts`
- `src/lib/anchors/types.ts`
- `src/lib/chains/chain-generator.ts` (classification branch usage)
- relevant tests under `src/test/*`

## Regression Guard
Existing anchor generation remains stable except where classification intentionally changes travel/local/soft behavior.

## Tests (Targeted)
1. `[LOCAL] Laundry 2h` -> local, no travel envelope.
2. class/tutorial with location -> travel.
3. missing location generic event -> soft.
4. override tags take precedence over heuristics.
