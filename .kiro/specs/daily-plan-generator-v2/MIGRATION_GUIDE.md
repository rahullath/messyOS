# Daily Plan Generator V2 - Migration Guide

## Overview

This guide helps you migrate from V1.2 (timeline-first) to V2 (chain-first) of the Daily Plan Generator. V2 is an **append-only** iteration that adds chain semantics on top of V1.2's working components.

**Key Principle**: V2 does NOT replace V1.2. It enhances it with chain-based execution while preserving backward compatibility.

## What Changed

### High-Level Changes

| Aspect | V1.2 | V2 |
|--------|------|-----|
| **Primary Interface** | Timeline view | Chain view (timeline demoted to secondary) |
| **Planning Paradigm** | Fill time with activities | Preserve dependencies around anchors |
| **Success Criteria** | On-time completion | Chain integrity (late but complete = SUCCESS) |
| **Meal Placement** | Time-based (target times) | Location-aware (home intervals only) |
| **Degradation** | Reschedule everything | Drop optional steps, preserve required |
| **Calendar Events** | Commitments | Anchors (with chain generation) |

### What V2 Keeps from V1.2

✅ **Exit times calculation** → Becomes Chain Completion Deadline  
✅ **Calendar → Commitment → Travel pipeline** → Becomes Anchor Parser  
✅ **Transition buffers** → Becomes State Transitions  
✅ **Current/Next UI** → Becomes Chain View  
✅ **Degradation logic** → Becomes "Drop non-required chain steps when late"  
✅ **Timeline generation** → Demoted to visualization (not truth)  
✅ **Database schema** → No changes (metadata in JSONB)  

### What V2 Adds

🆕 **Chain semantics** on existing TimeBlocks  
🆕 **Anchor-driven chain generation** (reverse builder from anchors)  
🆕 **Exit Readiness Gate** (boolean checklist: keys, phone, meds, cat fed)  
🆕 **Recovery buffers** as first-class chain steps  
🆕 **Meals as chain-support** (optional by default, location-aware)  
🆕 **Wake Ramp** concept (startup sequence)  
🆕 **Commitment Envelopes** (prep + travel + event + return + recovery)  
🆕 **Location awareness** (home vs not_home)  
🆕 **Momentum preservation** (no replanning mid-flow)  

### What V2 Does NOT Do

❌ Full rewrite of plan-builder  
❌ Removal of time blocks  
❌ New "engine" folder from scratch  
❌ Complex geolocation tracking  
❌ Multi-stop routing  
❌ Database schema changes  

## Backward Compatibility

### API Compatibility

**V1.2 Clients**: Continue to work without changes.

**V1.2 Request**:
```typescript
POST /api/daily-plan/generate
{
  "date": "2025-02-01",
  "preferences": {
    "energy_level": "medium"
  }
}
```

**V1.2 Response** (still supported):
```json
{
  "plan_id": "plan-abc123",
  "date": "2025-02-01",
  "time_blocks": [...]
}
```

**V2 Response** (enhanced, backward compatible):
```json
{
  "plan_id": "plan-abc123",
  "date": "2025-02-01",
  "time_blocks": [...],
  "chains": [...],           // NEW
  "home_intervals": [...],   // NEW
  "wake_ramp": {...},        // NEW
  "location_periods": [...]  // NEW
}
```

**Migration Strategy**: V1.2 clients ignore new fields. V2 clients use new fields for enhanced UI.

### Database Compatibility

**No schema changes required**. V2 uses existing `time_blocks` table with chain metadata stored in the `metadata` JSONB column.

**V1.2 TimeBlock**:
```json
{
  "id": "block-1",
  "type": "meal",
  "title": "Lunch",
  "start_time": "2025-02-01T12:00:00Z",
  "end_time": "2025-02-01T12:30:00Z",
  "metadata": {
    "target_time": "12:00",
    "placement_reason": "Default time"
  }
}
```

**V2 TimeBlock** (enhanced metadata):
```json
{
  "id": "block-2",
  "type": "chain-step",
  "title": "Feed cat",
  "start_time": "2025-02-01T12:00:00Z",
  "end_time": "2025-02-01T12:05:00Z",
  "metadata": {
    "role": {
      "type": "chain-step",
      "required": true,
      "chain_id": "chain-1"
    },
    "chain_id": "chain-1",
    "step_id": "feed-cat",
    "anchor_id": "anchor-1",
    "location_state": "at_home"
  }
}
```

**Migration Strategy**: V1.2 plans continue to work. V2 plans include enhanced metadata. No data migration required.

## Migration Steps

### Phase 1: Backend Integration (Completed)

✅ Add V2 services (Anchor Service, Chain Generator, Location State, Wake Ramp)  
✅ Modify plan-builder to generate chains alongside timeline  
✅ Add `/api/chains/today` endpoint  
✅ Extend `/api/daily-plan/generate` response with V2 fields  

### Phase 2: Frontend Integration (In Progress)

**Step 1**: Update API client to handle V2 response fields

```typescript
// Before (V1.2)
interface DailyPlanResponse {
  plan_id: string;
  date: string;
  time_blocks: TimeBlock[];
}

// After (V2)
interface DailyPlanResponse {
  plan_id: string;
  date: string;
  time_blocks: TimeBlock[];
  chains?: ExecutionChain[];        // NEW
  home_intervals?: HomeInterval[];  // NEW
  wake_ramp?: WakeRamp;            // NEW
  location_periods?: LocationPeriod[]; // NEW
}
```

**Step 2**: Add Chain View component

```typescript
// src/components/daily-plan/ChainView.tsx
import { ChainView } from './ChainView';

function DailyPlanPage({ plan }: { plan: DailyPlanResponse }) {
  return (
    <div>
      {/* Primary: Chain View */}
      {plan.chains && plan.chains.length > 0 && (
        <ChainView chains={plan.chains} />
      )}
      
      {/* Secondary: Timeline View */}
      <TimelineView timeBlocks={plan.time_blocks} />
    </div>
  );
}
```

**Step 3**: Update UI to prioritize chain view over timeline

```typescript
// Show chain view by default, timeline as secondary tab
<Tabs defaultValue="chain">
  <TabsList>
    <TabsTrigger value="chain">Chain View</TabsTrigger>
    <TabsTrigger value="timeline">Timeline</TabsTrigger>
  </TabsList>
  
  <TabsContent value="chain">
    <ChainView chains={plan.chains} />
  </TabsContent>
  
  <TabsContent value="timeline">
    <TimelineView timeBlocks={plan.time_blocks} />
  </TabsContent>
</Tabs>
```

### Phase 3: User Feedback and Iteration

**Step 1**: Deploy V2 to production with both views available  
**Step 2**: Gather user feedback on chain view vs timeline view  
**Step 3**: Iterate on chain templates based on user needs  
**Step 4**: Consider making timeline view optional (hidden by default)  

## New Features

### 1. Chain View UI

**Purpose**: Primary interface for executing chains.

**Features**:
- Next anchor (prominent, large)
- Chain Completion Deadline ("Complete chain by 16:15")
- Chain steps (checkbox style)
- Exit Gate status (blocked/ready with reasons)
- Current step highlight

**Usage**:
```typescript
import { ChainView } from '@/components/daily-plan/ChainView';

<ChainView
  chain={chain}
  exitGate={exitGate}
  onStepComplete={(stepId) => markStepCompleted(stepId)}
  onGateConditionToggle={(conditionId, satisfied) => 
    toggleGateCondition(conditionId, satisfied)
  }
/>
```

### 2. Exit Readiness Gate

**Purpose**: Boolean checklist that must be satisfied before leaving.

**Default Conditions**:
- Keys present
- Phone charged >= 20%
- Water bottle filled
- Meds taken
- Cat fed
- Bag packed

**Usage**:
```typescript
import { ExitGateService } from '@/lib/chains/exit-gate';

const exitGate = exitGateService.evaluateGate(conditions);

if (exitGate.status === 'blocked') {
  console.log('Cannot leave yet:', exitGate.blocked_reasons);
  // ['Keys not present', 'Phone not charged']
}
```

### 3. Location-Aware Meal Placement

**Purpose**: Only schedule meals when user is at home.

**Behavior**:
- Meals placed only in home intervals (location_state = at_home)
- If no home interval in meal window → skip meal
- Skip reason: "No home interval"

**Configuration**:
```typescript
// Enable meal scaffolding (3 meals)
POST /api/daily-plan/generate
{
  "date": "2025-02-01",
  "preferences": {
    "meal_scaffolding": true  // Default: false (0-1 meals)
  }
}
```

### 4. Wake Ramp

**Purpose**: Mandatory startup sequence after wake.

**Duration Logic**:
- Low energy: 120 minutes
- Medium energy: 90 minutes
- High energy: 75 minutes

**Skip Logic**:
- If planStart > wakeTime + 2 hours → skip (already awake)

**Usage**:
```typescript
import { WakeRampGenerator } from '@/lib/chains/wake-ramp';

const wakeRamp = wakeRampGenerator.generateWakeRamp(
  planStart,
  wakeTime,
  'medium' // energy level
);

if (!wakeRamp.skipped) {
  console.log('Wake ramp duration:', wakeRamp.duration, 'minutes');
}
```

### 5. Chain Degradation

**Purpose**: Drop optional steps when running late.

**Behavior**:
- Trigger when current time > Chain Completion Deadline
- Drop steps where can_skip_when_late = true
- Preserve steps where is_required = true
- Mark dropped steps with skip_reason = "Running late"

**Usage**:
```typescript
import { DegradationService } from '@/lib/chains/degradation-service';

if (degradationService.shouldTriggerDegradation(chain, currentTime)) {
  const degradedChain = degradationService.degradeChain(chain);
  console.log('Dropped steps:', degradationService.getDroppedSteps(chain, degradedChain));
}
```

### 6. Chain Status Tracking

**Purpose**: Track chain execution and determine success/failure.

**Success Criteria**:
- Late but complete → SUCCESS (chain integrity intact)
- On time but missing steps → FAILURE (chain integrity broken)

**Usage**:
```typescript
import { ChainStatusService } from '@/lib/chains/chain-status-service';

const statusResult = chainStatusService.evaluateChainStatus(chain, currentTime);

console.log(statusResult.message);
// "You made it! Chain completed late but intact."
// OR
// "Chain broke at Shower. Let's try again tomorrow."
```

## Configuration Options

### Meal Scaffolding

**Default**: `false` (0-1 meals, location-aware)

**Enable**: Set `meal_scaffolding: true` in preferences

```typescript
POST /api/daily-plan/generate
{
  "date": "2025-02-01",
  "preferences": {
    "meal_scaffolding": true  // Schedule up to 3 meals
  }
}
```

**Behavior**:
- `false`: Schedule 0-1 meals in next feasible home window
- `true`: Schedule up to 3 meals (breakfast, lunch, dinner) in home intervals

### Energy Level

**Default**: `medium`

**Options**: `low`, `medium`, `high`

**Effect**: Determines Wake Ramp duration

```typescript
POST /api/daily-plan/generate
{
  "date": "2025-02-01",
  "preferences": {
    "energy_level": "low"  // 120-minute Wake Ramp
  }
}
```

## Testing

### Unit Tests

V2 includes comprehensive unit tests for all new services:

```bash
# Run all V2 unit tests
npm test -- --grep "V2"

# Run specific service tests
npm test src/test/unit/anchor-service.test.ts
npm test src/test/unit/chain-generator.test.ts
npm test src/test/unit/location-state.test.ts
npm test src/test/unit/wake-ramp.test.ts
npm test src/test/unit/degradation-service.test.ts
npm test src/test/unit/chain-status-service.test.ts
```

### Integration Tests

V2 includes E2E tests for common scenarios:

```bash
# Run E2E tests
npm run test:e2e

# Specific scenarios
node scripts/test-e2e-no-anchors.ts        # Day with no calendar events
node scripts/test-e2e-single-class.ts      # Day with one class
node scripts/test-e2e-multiple-classes.ts  # Day with multiple classes
node scripts/test-e2e-wake-ramp-skip.ts    # Late generation (Wake Ramp skip)
node scripts/test-e2e-no-meals.ts          # Out all day (no meals)
node scripts/test-e2e-degradation.ts       # Running late (degradation)
node scripts/test-e2e-chain-integrity.ts   # Chain completion tracking
```

## Troubleshooting

### Issue: Chains not appearing in response

**Cause**: No calendar events for the day.

**Solution**: Check calendar service connection. If no events, chains will be empty (expected behavior).

```typescript
if (plan.chains.length === 0) {
  console.log('No anchors today - showing basic plan');
}
```

### Issue: Meals not being scheduled

**Cause**: No home intervals available (user out all day).

**Solution**: This is expected behavior. Meals are only scheduled in home intervals.

```typescript
if (plan.home_intervals.length === 0) {
  console.log('No home intervals - meals skipped');
}
```

### Issue: Wake Ramp not appearing

**Cause**: Plan generated late in day (planStart > wakeTime + 2 hours).

**Solution**: This is expected behavior. Wake Ramp is skipped when already awake.

```typescript
if (plan.wake_ramp?.skipped) {
  console.log('Wake Ramp skipped:', plan.wake_ramp.skip_reason);
}
```

### Issue: Travel time seems wrong

**Cause**: Travel service failure, using fallback duration (30 minutes).

**Solution**: Check travel service logs. Fallback is conservative estimate.

```typescript
const travelBlock = plan.time_blocks.find(b => b.type === 'travel');
if (travelBlock?.metadata?.fallback_used) {
  console.warn('Travel time estimated (service unavailable)');
}
```

### Issue: Chain template not matching anchor type

**Cause**: Missing template for anchor type, using default (class template).

**Solution**: This is expected behavior. Default template is used as fallback.

```typescript
if (chain.metadata?.template_fallback) {
  console.log('Using default template for anchor type:', chain.anchor.type);
}
```

## Performance Considerations

### Chain Generation

**Complexity**: O(n) where n = number of anchors (typically 1-3 per day)

**Optimization**: Chain templates are cached (loaded once at startup)

### Location State Calculation

**Complexity**: O(n) where n = number of chains

**Optimization**: Location periods calculated once per plan generation

### Home Interval Calculation

**Complexity**: O(n) where n = number of location periods

**Optimization**: Home intervals filtered by minimum duration (30 minutes)

## Future Enhancements (Not in V2)

These features are planned for future versions:

- **Persistent chain state**: Save step completion to database
- **Smart Exit Gate**: Auto-detect phone charge, location
- **Portable meal scheduling**: Allow meals during not_home
- **Chain templates customization**: User-defined chains
- **Multi-day chain planning**: Chains spanning multiple days
- **Chain analytics**: Track chain integrity over time

## Support

For questions or issues:

1. Check this migration guide
2. Review API documentation (`.kiro/specs/daily-plan-generator-v2/API_DOCUMENTATION.md`)
3. Review inline documentation guide (`.kiro/specs/daily-plan-generator-v2/INLINE_DOCUMENTATION_GUIDE.md`)
4. Check design document (`.kiro/specs/daily-plan-generator-v2/design.md`)
5. Check requirements document (`.kiro/specs/daily-plan-generator-v2/requirements.md`)

## Summary

V2 is an **append-only** iteration that adds chain-based execution on top of V1.2:

✅ **Backward compatible**: V1.2 clients continue to work  
✅ **No schema changes**: Chain metadata in JSONB  
✅ **Enhanced UI**: Chain view as primary interface  
✅ **Location-aware**: Meals only in home intervals  
✅ **Momentum preservation**: No replanning mid-flow  
✅ **Chain integrity**: Late but complete = SUCCESS  

**Migration is optional**: V1.2 continues to work. V2 enhances the experience for users who want chain-based execution.
