# Task 5 Dossier: Multi-user + Security + RLS Hardening

## Objective
Ensure touched flows are fully auth-guarded, session-scoped, and RLS-safe for shareable use.

## In Scope
- endpoint auth guard checks
- query scoping checks (`user_id` filters where needed)
- RLS verification for touched tables

## Out of Scope
- full platform-wide security rewrite in one pass
- unrelated module changes (Finance/Health/Content)

## Do Not Touch
- working OAuth provider wiring except needed signup/scoping fixes

## Mandatory Rules
- every endpoint requires auth
- derive `user_id` from session only
- never trust `user_id` in request payload
- all touched queries must be user-scoped
- cache keys must include user+date where relevant

## Touched Table Checklist
- `habits`
- `habit_entries`
- `daily_plans`
- `time_blocks`
- `wake_events`
- calendar/task tables used by touched path

## Query Audit Procedure
1. Search modified endpoint/service files for `.from(` calls.
2. Confirm auth guard precedes DB operations.
3. Confirm user scope predicate exists where table stores user-specific rows.
4. Verify no hardcoded/single-user identifiers.

## RLS Verification Procedure
1. Confirm RLS enabled for touched tables in migrations.
2. Confirm select/insert/update/delete policies enforce `auth.uid()` ownership semantics.
3. Add migration only if additive policy fix is required.

## Examples
### Allowed
- read session user id from auth context
- apply scoped filter by plan ownership or user_id

### Not Allowed
- accepting `user_id` from client and passing to writes
- unscoped reads by primary key without ownership validation

## Tests (Required)
1. Existing user login succeeds.
2. New signup sees empty dashboard.
3. User A cannot read/write User B `habit_entries`, `time_blocks`, `daily_plans`.
