# Guardrails Addendum (Operational)

## Non-Negotiables
1. **Append-only iteration**: Prefer metadata + new endpoints + small refactors. No rewrites, no new engine, no branch pivots.
2. **Do not change plan-builder v1.2 / meal placement logic** except where explicitly required by this stabilization spec.
3. **No breaking schema changes**: additive migrations only (nullable columns/indexes/policies). Never drop/rename columns.
4. **No new folder architecture**: add code next to existing modules.
5. **Keep existing working UI flows**: do not restructure pages/routing/component hierarchy unless task explicitly requires.

## Do Not Touch (Unless Explicitly Required)
- V1.2 meal placement algorithm + tests
- Existing chain generation logic currently producing correct "Complete chain by" and exit times
- Habits v2.1 importer correctness paths (dedupe + merge)
- Working auth provider setup (Google/GitHub), except multi-user scoping + signup flow fixes
- Unrelated modules/tables: Finance, Health, Content

## Explicit Callouts
- **No schema drops or renames.**
- **No plan-builder v1.2 rewrites.**

## Change Budget Rules
- Prefer adding a new endpoint over editing many call sites.
- Prefer metadata additions over new tables.
- Refactors must be local and keep public signatures stable unless spec requires otherwise.

## Project Reality Snapshot
- Daily Plan / Chain View: partially working; correctness and execution fidelity are primary.
- Habits: strong base; importer dedupe and per-habit notes already improved.
- Tasks: basic scheduler/list works but UX messy; out of scope here.
- Finance/Health/Content: incomplete/static/import-only; out of scope.
- PWA/mobile: weak baseline; only core screens targeted in this pass.

## Safety Rules
- Every API route must require auth and derive `user_id` from session.
- Never accept `user_id` from client payload.
- Every DB query must filter by `user_id`.
- Verify/enable RLS for touched tables before shipping.
- Avoid single-user cache keys; cache must be user+date keyed.

## Stop Conditions (Verbatim)
Stop and report immediately if:
- Cannot locate where chain step completion state should live.
- Conflicting sources of truth exist for completion state.
- RLS policies are missing and authoritative tables are unclear.
- Proceeding would require rewriting plan-builder or schema drops.
