# Current State Map (Repo Grounding)

## Core Files
- Chain UI: `src/components/daily-plan/ChainView.tsx`
- Daily plan container: `src/components/daily-plan/DailyPlanPageContent.tsx`
- Existing activity API: `src/pages/api/daily-plan/[id]/activity/[activityId].ts`
- Time block data layer: `src/lib/daily-plan/database.ts`
- Chain generator: `src/lib/chains/chain-generator.ts`
- Anchor typing/classification: `src/lib/anchors/types.ts`, `src/lib/anchors/anchor-service.ts`
- Calendar service: `src/lib/calendar/calendar-service.ts`
- Type surfaces: `src/types/daily-plan.ts`, `src/lib/chains/types.ts`

## Observed Current Behavior
- Existing API route updates block status via plan activity path (`completed` / `skipped`).
- Chain view step completion handler is still a placeholder in daily plan container.
- Exit gate condition toggle exists in UI service state but persistence is TODO.
- Chain conversion already stores role and gate metadata on time blocks.
- Anchor model currently uses anchor types (`class | seminar | workshop | appointment | other`), not explicit `travel/local/soft`.

## Known Gaps
- Step completion handler TODO
- Gate persistence TODO
- No explicit `travel/local/soft` anchor kind yet

## Practical Implication
The safest path is additive:
- add endpoint-level writes for completion/meta updates
- persist through `time_blocks.metadata`
- avoid changing core plan-builder/envelope timing semantics
