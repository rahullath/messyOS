# Design Document: Chain-Based Execution Engine (V2)

## Overview

V2 transforms the daily plan generator from a timeline-first system into a chain-first system. The core insight: life is not a list of tasks to fill time, but a directed acyclic graph (DAG) of dependencies anchored around immovable events.

This design preserves V1.2's working components (exit times, travel, buffers, UI, degradation) and adds chain semantics on top. No rewrite. Append-only iteration.

**Key Design Principles:**
- **Chain Integrity > Clock Accuracy**: Late but complete = SUCCESS
- **Dependencies are rigid, time is elastic**: Except at anchor boundaries
- **Anchor-Relative Deadlines**: "Complete chain by T-45" not "Shower at 4:50"
- **Exit Readiness Gate**: Boolean checklist, not todo list
- **Recovery Buffers**: Required state transitions, not optional breaks
- **Momentum Preservation**: Don't replan mid-flow

## Architecture

### High-Level Flow

```
Calendar Events
    ↓
Anchor Parser (classify, extract metadata)
    ↓
Chain Generator (for each anchor, generate backward chain)
    ↓
Chain Steps → TimeBlocks (with chain metadata)
    ↓
Timeline Generator (V1.2, demoted to visualization)
    ↓
Chain View UI (primary interface)
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     Calendar Service                         │
│                  (existing, unchanged)                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Anchor Service (NEW)                      │
│  - Parse calendar events                                     │
│  - Classify as anchors                                       │
│  - Extract: start, location, type, must_attend               │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  Chain Generator (NEW)                       │
│  - Load chain template for anchor type                       │
│  - Calculate Chain Completion Deadline (ARD)                 │
│  - Generate backward chain from anchor                       │
│  - Create TimeBlocks with chain metadata                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Plan Builder (V1.2, MODIFIED)                   │
│  - Keep timeline generation (demoted)                        │
│  - Add chain-aware meal placement                            │
│  - Add location state tracking                               │
│  - Add home intervals calculation                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  Chain View UI (NEW)                         │
│  - Display next anchor                                       │
│  - Display chain steps (checkbox style)                      │
│  - Display Exit Gate status                                  │
│  - Display Chain Completion Deadline                         │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Anchor Service

**File**: `src/lib/anchors/anchor-service.ts`

**Purpose**: Parse calendar events and classify them as anchors.

**Interface**:
```typescript
interface Anchor {
  id: string;
  start: Date;
  end: Date;
  title: string;
  location?: string;
  type: 'class' | 'seminar' | 'workshop' | 'appointment' | 'other';
  must_attend: boolean;
  calendar_event_id: string;
}

class AnchorService {
  async getAnchorsForDate(date: Date, userId: string): Promise<Anchor[]>;
  classifyAnchorType(event: CalendarEvent): Anchor['type'];
}
```

**Classification Logic**:
- If title contains "lecture", "class", "tutorial" → type = 'class'
- If title contains "seminar", "workshop" → type = 'seminar'
- If title contains "appointment", "meeting" → type = 'appointment'
- If location exists → must_attend = true
- If no location → must_attend = false (assume optional/remote)

### 2. Chain Templates

**File**: `src/lib/chains/templates.ts`

**Purpose**: Define execution chains for different anchor types.

**Interface**:
```typescript
interface ChainStep {
  id: string;
  name: string;
  duration_estimate: number; // minutes
  is_required: boolean;
  can_skip_when_late: boolean;
  gate_tags?: string[]; // for Exit Gate steps
}

interface ChainTemplate {
  anchor_type: Anchor['type'];
  steps: ChainStep[];
}

const CHAIN_TEMPLATES: Record<Anchor['type'], ChainTemplate> = {
  class: {
    anchor_type: 'class',
    steps: [
      { id: 'feed-cat', name: 'Feed cat', duration_estimate: 5, is_required: true, can_skip_when_late: false },
      { id: 'bathroom', name: 'Bathroom', duration_estimate: 10, is_required: true, can_skip_when_late: false },
      { id: 'hygiene', name: 'Hygiene (brush teeth)', duration_estimate: 5, is_required: true, can_skip_when_late: false },
      { id: 'shower', name: 'Shower', duration_estimate: 15, is_required: false, can_skip_when_late: true },
      { id: 'dress', name: 'Get dressed', duration_estimate: 10, is_required: true, can_skip_when_late: false },
      { id: 'pack-bag', name: 'Pack bag', duration_estimate: 10, is_required: true, can_skip_when_late: false },
      { id: 'exit-gate', name: 'Exit Readiness Check', duration_estimate: 2, is_required: true, can_skip_when_late: false, gate_tags: ['keys', 'phone', 'water', 'meds', 'cat-fed', 'bag-packed'] },
      { id: 'leave', name: 'Leave house', duration_estimate: 0, is_required: true, can_skip_when_late: false },
    ]
  },
  // ... other templates
};
```

### 3. Chain Generator

**File**: `src/lib/chains/chain-generator.ts`

**Purpose**: Generate execution chains from anchors.

**Interface**:
```typescript
interface ExecutionChain {
  chain_id: string;
  anchor_id: string;
  anchor: Anchor;
  chain_completion_deadline: Date;
  steps: ChainStepInstance[];
  commitment_envelope: CommitmentEnvelope;
}

interface ChainStepInstance {
  step_id: string;
  chain_id: string;
  name: string;
  start_time: Date;
  end_time: Date;
  duration: number;
  is_required: boolean;
  can_skip_when_late: boolean;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  role: 'chain-step' | 'exit-gate' | 'recovery' | 'anchor';
}

interface CommitmentEnvelope {
  prep: ChainStepInstance;
  travel_there: ChainStepInstance;
  anchor: ChainStepInstance;
  travel_back: ChainStepInstance;
  recovery: ChainStepInstance;
}

class ChainGenerator {
  async generateChainsForDate(date: Date, userId: string): Promise<ExecutionChain[]>;
  calculateChainCompletionDeadline(anchor: Anchor, travelDuration: number): Date;
  generateBackwardChain(anchor: Anchor, template: ChainTemplate, deadline: Date): ChainStepInstance[];
}
```

**Algorithm**:
```
For each anchor:
  1. Get travel duration from travel service
  2. Calculate Chain Completion Deadline = anchor.start - travel_duration - 45 minutes
  3. Load chain template for anchor.type
  4. Generate backward chain:
     - Start from deadline
     - Work backward through chain steps
     - Assign start/end times to each step
     - Create commitment envelope (prep, travel_there, anchor, travel_back, recovery)
  5. Convert chain steps to TimeBlocks with metadata
  6. Return ExecutionChain
```

### 4. Exit Readiness Gate

**File**: `src/lib/chains/exit-gate.ts`

**Purpose**: Boolean gate that must be satisfied before leaving.

**Interface**:
```typescript
interface GateCondition {
  id: string;
  name: string;
  satisfied: boolean;
}

interface ExitGate {
  status: 'blocked' | 'ready';
  conditions: GateCondition[];
  blocked_reasons: string[];
}

const DEFAULT_GATE_CONDITIONS: GateCondition[] = [
  { id: 'keys', name: 'Keys present', satisfied: false },
  { id: 'phone', name: 'Phone charged >= 20%', satisfied: false },
  { id: 'water', name: 'Water bottle filled', satisfied: false },
  { id: 'meds', name: 'Meds taken', satisfied: false },
  { id: 'cat-fed', name: 'Cat fed', satisfied: false },
  { id: 'bag-packed', name: 'Bag packed', satisfied: false },
];

class ExitGateService {
  evaluateGate(conditions: GateCondition[]): ExitGate;
  toggleCondition(conditionId: string, satisfied: boolean): void;
}
```

### 5. Location State Tracker

**File**: `src/lib/chains/location-state.ts`

**Purpose**: Track whether user is at home or not.

**Interface**:
```typescript
type LocationState = 'at_home' | 'not_home';

interface LocationPeriod {
  start: Date;
  end: Date;
  state: LocationState;
}

interface HomeInterval {
  start: Date;
  end: Date;
  duration: number; // minutes
}

class LocationStateTracker {
  calculateLocationPeriods(chains: ExecutionChain[]): LocationPeriod[];
  calculateHomeIntervals(locationPeriods: LocationPeriod[]): HomeInterval[];
  isHomeInterval(time: Date, homeIntervals: HomeInterval[]): boolean;
}
```

**Algorithm**:
```
1. Start with location_state = at_home at planStart
2. For each chain:
   - When travel_there starts: location_state = not_home
   - When travel_back ends + recovery completes: location_state = at_home
3. Calculate home intervals:
   - Start with full day (planStart to sleepTime)
   - Subtract all commitment envelopes (prep through recovery)
   - Remaining periods = home intervals
4. Filter home intervals:
   - Keep only intervals >= 30 minutes
   - Discard shorter intervals (too short for meals)
```

### 6. Wake Ramp Generator

**File**: `src/lib/chains/wake-ramp.ts`

**Purpose**: Generate wake-up ramp block.

**Interface**:
```typescript
interface WakeRamp {
  start: Date;
  end: Date;
  duration: number; // minutes
  components: {
    toilet: number;
    hygiene: number;
    shower: number;
    dress: number;
    buffer: number;
  };
  skipped: boolean;
  skip_reason?: string;
}

class WakeRampGenerator {
  generateWakeRamp(planStart: Date, wakeTime: Date, energy: 'low' | 'medium' | 'high'): WakeRamp;
  shouldSkipWakeRamp(planStart: Date, wakeTime: Date): boolean;
}
```

**Duration Logic**:
- energy = low → 120 minutes (toilet 20, hygiene 10, shower 25, dress 20, buffer 45)
- energy = medium → 90 minutes (toilet 20, hygiene 10, shower 25, dress 20, buffer 15)
- energy = high → 75 minutes (toilet 20, hygiene 10, shower 25, dress 20, buffer 0)

**Skip Logic**:
- If planStart > wakeTime + 2 hours → skip (already awake)
- Otherwise → include

### 7. Modified Plan Builder

**File**: `src/lib/daily-plan/plan-builder.ts` (MODIFY, don't replace)

**Changes**:
1. Add chain generation step before timeline generation
2. Add location state tracking
3. Modify meal placement to respect home intervals
4. Add Wake Ramp generation
5. Keep existing timeline generation (demoted to visualization)

**New Generation Order**:
```
1. Calculate planStart
2. Generate Wake Ramp (if not skipped)
3. Get anchors from Anchor Service
4. Generate chains from Chain Generator
5. Calculate location periods and home intervals
6. Place meals in home intervals (optional, 0-1 meals by default)
7. Generate timeline (V1.2 logic, demoted)
8. Return plan with chains + timeline
```

### 8. Chain View UI Component

**File**: `src/components/daily-plan/ChainView.tsx` (NEW)

**Purpose**: Primary interface for executing chains.

**Interface**:
```typescript
interface ChainViewProps {
  chain: ExecutionChain;
  exitGate: ExitGate;
  onStepComplete: (stepId: string) => void;
  onGateConditionToggle: (conditionId: string, satisfied: boolean) => void;
}

export function ChainView({ chain, exitGate, onStepComplete, onGateConditionToggle }: ChainViewProps) {
  // Display:
  // - Next Anchor (big, prominent)
  // - Chain Completion Deadline ("Complete chain by 16:15")
  // - Chain steps (checkbox style)
  // - Exit Gate status (blocked/ready with reasons)
  // - Current step highlight
}
```

### 9. API Endpoints

**New Endpoint**: `GET /api/chains/today`

**Purpose**: Return chains for today (independent of timeline).

**Response**:
```typescript
interface ChainsResponse {
  date: string;
  anchors: Anchor[];
  chains: ExecutionChain[];
  home_intervals: HomeInterval[];
  wake_ramp?: WakeRamp;
}
```

**Modified Endpoint**: `POST /api/daily-plan/generate`

**Changes**: Add chains to response alongside timeline.

**Response**:
```typescript
interface DailyPlanResponse {
  // Existing V1.2 fields
  plan_id: string;
  date: string;
  time_blocks: TimeBlock[];
  
  // New V2 fields
  chains: ExecutionChain[];
  home_intervals: HomeInterval[];
  wake_ramp?: WakeRamp;
  location_periods: LocationPeriod[];
}
```

## Data Models

### TimeBlock Metadata Extension

**Existing**: TimeBlock has `metadata: Record<string, any>`

**New**: Add chain semantics to metadata:

```typescript
interface TimeBlockMetadata {
  // Existing V1.2 fields
  target_time?: string;
  placement_reason?: string;
  skip_reason?: string;
  
  // New V2 fields
  role?: {
    type: 'anchor' | 'chain-step' | 'exit-gate' | 'recovery';
    required: boolean;
    chain_id?: string;
    gate_conditions?: GateCondition[];
  };
  chain_id?: string;
  step_id?: string;
  anchor_id?: string;
  location_state?: LocationState;
  commitment_envelope?: {
    envelope_id: string;
    envelope_type: 'prep' | 'travel_there' | 'anchor' | 'travel_back' | 'recovery';
  };
}
```

### Database Schema (No Changes Required)

V2 uses existing `time_blocks` table. Chain metadata stored in `metadata` JSONB column.

**Optional**: Add `execution_chains` table for persistence (future enhancement).

```sql
-- Future enhancement (not required for V2)
CREATE TABLE execution_chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  anchor_id TEXT NOT NULL,
  chain_completion_deadline TIMESTAMPTZ NOT NULL,
  steps JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Anchor Classification Consistency

*For any* calendar event with a location, the Anchor Service should classify it with must_attend = true.

**Validates: Requirements 1.4**

### Property 2: Chain Completion Deadline Calculation

*For any* anchor with travel duration T, the Chain Completion Deadline should equal anchor.start - T - 45 minutes.

**Validates: Requirements 4.1**

### Property 3: Chain Step Ordering

*For any* generated chain, the steps should be ordered such that each step's end_time equals the next step's start_time (no gaps or overlaps).

**Validates: Requirements 12.4**

### Property 4: Exit Gate Blocking

*For any* Exit Gate with at least one unsatisfied condition, the status should be 'blocked' and blocked_reasons should contain the names of unsatisfied conditions.

**Validates: Requirements 3.3, 3.4**

### Property 5: Location State Transitions

*For any* commitment envelope, location_state should transition from at_home → not_home (at travel_there start) → at_home (at recovery end).

**Validates: Requirements 8.2, 8.3, 8.4**

### Property 6: Home Interval Meal Placement

*For any* meal placed in the plan, its time should fall within a home interval (location_state = at_home).

**Validates: Requirements 8.5, 11.2**

### Property 7: Wake Ramp Skip Condition

*For any* plan where planStart > wakeTime + 2 hours, the Wake Ramp should be skipped.

**Validates: Requirements 10.1**

### Property 8: Recovery Buffer Duration

*For any* anchor with duration >= 2 hours, the recovery buffer should be 20 minutes; otherwise 10 minutes.

**Validates: Requirements 5.2, 5.3**

### Property 9: Commitment Envelope Completeness

*For any* anchor with a location, the commitment envelope should contain exactly 5 blocks: prep, travel_there, anchor, travel_back, recovery.

**Validates: Requirements 7.1**

### Property 10: Chain Integrity on Overrun

*For any* chain where steps overrun but all required steps complete, the chain status should be marked as SUCCESS (not FAILURE).

**Validates: Requirements 16.3, 20.1**

### Property 11: Degradation Preserves Required Steps

*For any* chain in degradation mode, all steps with is_required = true should remain in the chain (not dropped).

**Validates: Requirements 15.3**

### Property 12: Home Interval Minimum Duration

*For any* calculated home interval with duration < 30 minutes, it should be excluded from the list of valid home intervals.

**Validates: Requirements 17.2**

### Property 13: Meal Scaffolding Default

*For any* plan generated with meal_scaffolding = false (default), the number of scheduled meals should be 0 or 1.

**Validates: Requirements 11.5**

### Property 14: Chain Metadata Linkage

*For any* TimeBlock with role.type = 'chain-step', it should have a valid chain_id that links to an ExecutionChain.

**Validates: Requirements 18.2**

### Property 15: Anchor-Relative Deadline Display

*For any* chain displayed in the UI, the deadline should be shown as "Complete chain by [time]" (not individual task times).

**Validates: Requirements 4.2**

## Error Handling

### Calendar Service Failures

**Scenario**: Calendar API is unavailable or returns errors.

**Handling**:
- Catch error in Anchor Service
- Return empty anchors array
- Log error for debugging
- Display message in UI: "No calendar access. Showing basic plan."
- Generate plan without anchors (just Wake Ramp + meals + tasks)

### Travel Service Failures

**Scenario**: Travel API fails to calculate duration.

**Handling**:
- Use fallback duration: 30 minutes (conservative estimate)
- Log warning with anchor details
- Mark travel block with metadata: `fallback_used: true`
- Display warning in UI: "Travel time estimated (service unavailable)"

### Chain Generation Failures

**Scenario**: Chain template missing for anchor type.

**Handling**:
- Use default template (class template)
- Log warning with anchor type
- Continue chain generation
- Mark chain with metadata: `template_fallback: true`

### Exit Gate Condition Failures

**Scenario**: User cannot satisfy all gate conditions.

**Handling**:
- Allow user to override gate (manual "Force Leave" button)
- Log override event
- Mark chain with metadata: `gate_overridden: true`
- Display warning: "Left without completing checklist"

### Home Interval Calculation Failures

**Scenario**: No home intervals exist (user out all day).

**Handling**:
- Skip all meals
- Mark meals with skip_reason: "No home interval"
- Display message: "No meals scheduled (out all day)"
- Suggest portable meal options (future enhancement)

## Testing Strategy

### Unit Tests

**Focus**: Specific examples, edge cases, error conditions.

**Test Files**:
- `src/test/unit/anchor-service.test.ts`
- `src/test/unit/chain-generator.test.ts`
- `src/test/unit/exit-gate.test.ts`
- `src/test/unit/location-state.test.ts`
- `src/test/unit/wake-ramp.test.ts`

**Example Tests**:
- Anchor classification for different event titles
- Chain Completion Deadline calculation with various travel durations
- Exit Gate status with different condition combinations
- Home interval calculation with multiple anchors
- Wake Ramp skip logic with different planStart times

### Property-Based Tests

**Focus**: Universal properties across all inputs.

**Library**: `fast-check` (TypeScript property-based testing)

**Configuration**: Minimum 100 iterations per property test.

**Test Files**:
- `src/test/property/chain-properties.test.ts`
- `src/test/property/location-properties.test.ts`
- `src/test/property/gate-properties.test.ts`

**Example Properties**:
- **Property 2**: For any anchor and travel duration, verify Chain Completion Deadline = anchor.start - travel - 45min
- **Property 5**: For any commitment envelope, verify location state transitions correctly
- **Property 10**: For any chain with overruns but complete required steps, verify status = SUCCESS

**Test Tags**: Each property test must include comment:
```typescript
// Feature: daily-plan-generator-v2, Property 2: Chain Completion Deadline Calculation
```

### Integration Tests

**Focus**: End-to-end chain generation and plan building.

**Test Files**:
- `scripts/test-chain-generation-e2e.ts`
- `scripts/test-location-aware-meals.ts`
- `scripts/test-commitment-envelopes.ts`

**Example Tests**:
- Generate plan with multiple anchors, verify chains created correctly
- Generate plan with no home intervals, verify meals skipped
- Generate plan late in day, verify Wake Ramp skipped
- Generate plan with degradation, verify optional steps dropped

### Manual Testing Checklist

**Scenarios**:
1. Day with no anchors → verify basic plan with Wake Ramp + meals
2. Day with one class → verify chain generated with all steps
3. Day with multiple classes → verify multiple chains, no overlaps
4. Generate plan at 2pm → verify Wake Ramp skipped
5. Toggle Exit Gate conditions → verify status updates
6. Complete chain steps → verify checkboxes update
7. Run late → verify degradation drops optional steps
8. Out all day → verify no meals scheduled

## Implementation Notes

### Append-Only Approach

**Critical**: This is NOT a rewrite. We're adding chain semantics on top of V1.2.

**Do**:
- Add new files: `anchor-service.ts`, `chain-generator.ts`, `exit-gate.ts`, `location-state.ts`, `wake-ramp.ts`
- Modify existing: `plan-builder.ts` (add chain generation step)
- Add new UI: `ChainView.tsx`
- Extend metadata: Add `role` field to TimeBlock metadata

**Don't**:
- Replace `plan-builder.ts`
- Remove timeline generation
- Delete V1.2 meal placement logic (modify it)
- Create new database tables (use existing `time_blocks`)

### Migration Path

**Phase 1**: Add chain generation alongside timeline (both exist)
**Phase 2**: Add Chain View UI (timeline still visible)
**Phase 3**: Demote timeline to secondary tab (chain view primary)
**Phase 4**: Gather user feedback, iterate on chain templates

### Performance Considerations

**Chain Generation**: O(n) where n = number of anchors (typically 1-3 per day)
**Location State Calculation**: O(n) where n = number of chains
**Home Interval Calculation**: O(n) where n = number of location periods

**Optimization**: Cache chain templates (loaded once at startup)

### Backward Compatibility

**V1.2 Plans**: Continue to work (no chain metadata, just timeline)
**V2 Plans**: Include both chains and timeline
**API**: Add new `/api/chains/today` endpoint, keep existing `/api/daily-plan/generate`

### Future Enhancements (Not in V2)

- Persistent chain state (save step completion to database)
- Smart Exit Gate (auto-detect phone charge, location)
- Portable meal scheduling (allow meals during not_home)
- Chain templates customization (user-defined chains)
- Multi-day chain planning (chains spanning multiple days)
- Chain analytics (track chain integrity over time)
