# Canonical Task Order (V2.2 Stabilization)

## 1) Chain Completion
### Objective
Make chain steps checkable, persistent, fast, and non-reordering.
### In Scope
- `src/components/daily-plan/ChainView.tsx`
- `src/components/daily-plan/DailyPlanPageContent.tsx`
- `src/pages/api/time-blocks/*` (new)
- `src/lib/daily-plan/database.ts`
- `src/types/daily-plan.ts`
### Out of Scope
- plan-builder overhaul
- template rewrites
### Done Criteria
- Checkbox toggles persist after reload.
- No unexpected step reorder.
- Interaction latency remains fast (no heavy click handler work).

## 2) Exit Gate Persistence + Eyeglasses
### Objective
Persist gate toggles in exit-gate time block metadata and include eyeglasses condition.
### In Scope
- exit gate condition defaults and metadata merge endpoint
- chain view gate toggle persistence
### Out of Scope
- sensor integrations
### Done Criteria
- Gate toggles persist by day/chain.
- Eyeglasses appears and behaves like other conditions.

## 3) Shower Decider
### Objective
Single shower step with deterministic mode selection and manual override persistence.
### In Scope
- chain metadata decision logic
- UI mode selector and persistence
### Out of Scope
- multi-step shower sequence redesign
### Done Criteria
- Mode auto-selected from slack rules.
- Manual override persists.

## 4) Calendar Classifier
### Objective
Differentiate travel anchors from local/soft anchors.
### In Scope
- classification logic and override tags (`[TRAVEL]`, `[LOCAL]`, `[SOFT]`)
### Out of Scope
- calendar source architecture rewrites
### Done Criteria
- Local anchors block time without travel envelope.
- Travel anchors continue full envelope behavior.

## 5) Multi-user + RLS Hardening
### Objective
Guarantee endpoint auth scoping + DB isolation.
### In Scope
- API auth guard audit and fixes
- query scoping audit
- RLS policy verification for touched tables
### Out of Scope
- unrelated module rewrites
### Done Criteria
- No cross-user read/write for touched flows.

## 6) Mobile Baseline
### Objective
Core screens usable on phone with no horizontal scroll and good tap targets.
### In Scope
- Chain View, Habits, Settings responsive baseline
### Out of Scope
- full design-system overhaul
### Done Criteria
- Core screens usable and performant on mobile.

## 7) Optional Demo Mode
### Objective
Safe shareable experience with no personal data leakage.
### In Scope
- demo user path (preferred)
### Out of Scope
- unsafe mixed-data shortcuts

## 8) Optional Meal Scaffolding
### Objective
Add optional meal-support section without forcing rigid schedule.
### In Scope
- optional helper hints only
### Out of Scope
- meal-engine rewrites
