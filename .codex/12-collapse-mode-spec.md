# Collapse Mode Spec (V2.2 Next Module)

## Summary
Collapse Mode is a recovery-first fallback when a user misses an anchor or reports chaos.  
It does not replace normal chain generation. It adds a short recovery chain so users can re-enter the day without shame loops.

## Goals
- Prevent all-or-nothing failures after missed anchors.
- Keep the user in an actionable flow with minimal cognitive load.
- Preserve existing chain/timeline logic when Collapse Mode is inactive.

## Non-Goals
- Rewriting chain generator or plan-builder v1.2.
- Replacing standard chain execution on normal days.
- Introducing AI-heavy adaptive behavior in v1.

## Trigger Conditions
Any one condition can activate Collapse Mode:
1. User clicks `Today is chaos`.
2. User marks current anchor as missed.
3. System detects anchor start passed and chain not completed.

## Recovery Chain v1
Default sequence (editable later):
1. Eat or hydrate
2. Bathroom/basic hygiene
3. Reset environment (2-5m)
4. Pick one tiny next win
5. Optional support ping

## Data Model (Append-Only)
Use existing metadata fields:

### `daily_plans.metadata.collapse_mode`
```ts
type CollapseModeState = {
  active: boolean;
  triggered_at: string; // ISO
  trigger_reason: 'missed_anchor' | 'manual_chaos' | 'late_start';
  recovery_chain_id?: string;
};
```

### `time_blocks.metadata.role` extension
```ts
type RecoveryRole = {
  type: 'recovery';
  recovery_kind: 'collapse';
  chain_id: string;
  step_key: string;
};
```

## Planned API Endpoints
All routes must:
- Require auth.
- Derive `user_id` from session only.
- Query/update with user-scoped filters.

### `POST /api/daily-plan/:id/collapse-mode/activate`
Request:
```json
{ "trigger_reason": "manual_chaos" }
```
Behavior:
- Verify plan belongs to user.
- Set `daily_plans.metadata.collapse_mode.active = true`.
- Create or load recovery time blocks.
- Return updated plan payload.

### `POST /api/daily-plan/:id/collapse-mode/deactivate`
Behavior:
- Set `collapse_mode.active = false`.
- Keep recovery history metadata for audit.
- Return updated plan payload.

### `POST /api/daily-plan/:id/collapse-mode/recovery-complete`
Behavior:
- Mark recovery chain complete.
- Optionally suggest return to normal timeline segment.

## UI Changes
### Daily Plan Header
- Add secondary action button: `Activate Collapse Mode`.
- Show subtle helper text: `Switch to recovery steps`.

### When Active
- Show pinned `Recovery Chain` panel above timeline.
- Suppress punitive/invalid copy.
- Show action: `Resume normal plan`.

### When Inactive
- No visual regressions to current chain/timeline behavior.

## Rules and Guardrails
- Do not modify core chain generation behavior for normal plans.
- No schema drops/renames.
- Keep completion persistence endpoints unchanged.
- Collapse Mode must be optional and reversible.

## Test Plan
1. Activate with owned plan:
- Expected: mode active + recovery chain visible.
2. Activate with unowned plan id:
- Expected: 404/403 and no cross-user data access.
3. Deactivate after activation:
- Expected: return to normal rendering; original blocks intact.
4. Completion toggles with Collapse Mode inactive:
- Expected: unchanged behavior.
5. Completion toggles with Collapse Mode active:
- Expected: recovery steps persist completion state correctly.

## Acceptance Criteria
- User can enter and exit Collapse Mode without data loss.
- Cross-user isolation is maintained via endpoint scoping + RLS.
- Existing chain output and exit gate behavior remain unchanged unless mode is active.
