# Task 2 Dossier: Exit Gate Persistence + Eyeglasses

## Objective
Persist gate condition toggles in the exit-gate time block metadata and add eyeglasses as a supported default condition.

## In Scope
- New endpoint:
  - `POST /api/time-blocks/:id/update-meta`
- Exit-gate metadata merge semantics for `gate_conditions`.
- Add eyeglasses condition to defaults where gate conditions are initialized.

## Out of Scope
- external sensor automation
- global preference engine redesign

## Do Not Touch
- existing chain envelope timing
- existing correctness of "Complete by" + exit times

## File Touch Budget (Minimal)
- `src/pages/api/time-blocks/[id]/update-meta.ts` (new)
- `src/lib/chains/chain-generator.ts` (default gate condition list update)
- `src/components/daily-plan/DailyPlanPageContent.tsx` (persist on toggle)
- `src/types/daily-plan.ts` and/or `src/lib/chains/types.ts` (gate condition typing alignment)

## Metadata Contract
- store gate state under exit-gate block metadata role:
  - `role.gate_conditions: GateCondition[]`
- merge update must preserve non-gate metadata keys
- state is scoped to **that day/that chain block** only

## Endpoint Semantics
- require auth
- derive user from session
- load block through scoped query
- shallow/deep-safe merge for provided metadata subset
- reject payloads attempting to set `user_id`

## Test Matrix
1. Toggle persists across reload.
2. Toggle affects only current day/chain block.
3. No contamination across separate plans/chains.
4. Eyeglasses condition appears and persists.
