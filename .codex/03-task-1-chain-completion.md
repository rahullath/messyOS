# Task 1 Dossier: Chain Step Completion

## Objective
Implement persistent chain-step completion with optimistic UI and rollback, while preserving ordering and current chain semantics.

## In Scope
- New endpoints:
  - `POST /api/time-blocks/:id/complete`
  - `POST /api/time-blocks/:id/uncomplete`
- Metadata extension in `time_blocks.metadata`:
  - `completed_at: ISO string`
  - `completed_by: user_id`
- UI optimistic toggles in Chain View integration path.

## Out of Scope
- plan-builder algorithm changes
- chain template redesign
- schema-breaking migrations

## Do Not Touch
- v1.2 meal placement logic
- core chain completion deadline math
- envelope timing behavior producing correct exit times

## File Touch Budget (Minimal)
- `src/pages/api/time-blocks/[id]/complete.ts` (new)
- `src/pages/api/time-blocks/[id]/uncomplete.ts` (new)
- `src/lib/daily-plan/database.ts` (helper update/merge utility)
- `src/components/daily-plan/DailyPlanPageContent.tsx` (replace TODO handler)
- `src/components/daily-plan/ChainView.tsx` (optimistic callback wiring only)
- `src/types/daily-plan.ts` (metadata typings)

## Behavior Spec
- `complete` endpoint:
  - require auth
  - fetch block via scoped access
  - merge metadata (retain existing fields)
  - set `completed_at = now()`, `completed_by = session.user.id`
- `uncomplete` endpoint:
  - require auth
  - merge metadata clearing `completed_at` and `completed_by`
- UI:
  - optimistic state update
  - async POST
  - rollback on failure
  - no expensive list recompute in click handler

## INP Constraints
- no heavy computation in click handlers
- use transition/memoization patterns for large list renders
- avoid full resort/rebuild per click

## Invariants
- **Do not reorder chain steps** unexpectedly.
- Existing "Complete by" and exit-time behavior remains unchanged.

## Tests (Targeted)
1. API unit: complete/uncomplete requires auth and applies scoped metadata merge.
2. UI integration: checkbox persists after reload.
3. Regression: step order unchanged after completion toggle.
