# Daily Plan Generator V2 - Inline Documentation Guide

## Overview

This document provides comprehensive inline documentation for the V2 Chain-Based Execution Engine. All new V2 classes and methods include JSDoc comments that explain their purpose, parameters, return values, and requirements validation.

## Documentation Standards

All V2 code follows these JSDoc standards:

1. **Class-level documentation**: Explains the purpose and responsibilities of the class
2. **Method-level documentation**: Includes:
   - Purpose description
   - `@param` tags for all parameters
   - `@returns` tag for return values
   - Requirements validation references (e.g., "Requirements: 4.1, 4.2")
3. **Algorithm documentation**: Complex algorithms include step-by-step explanations
4. **Error handling documentation**: Error scenarios and fallback behavior are documented

## Core Algorithms

### 1. Chain Generation Algorithm

**Location**: `src/lib/chains/chain-generator.ts`

**Purpose**: Generate execution chains from anchors by working backward from anchor start time.

**Algorithm Steps**:

```typescript
/**
 * Chain Generation Algorithm
 * 
 * For each anchor:
 *   1. Get travel duration from travel service (with fallback handling)
 *   2. Calculate Chain Completion Deadline = anchor.start - travel_duration - 45 minutes
 *   3. Load chain template for anchor.type (with fallback to default)
 *   4. Generate backward chain:
 *      - Start from deadline
 *      - Work backward through chain steps
 *      - Assign start/end times to each step
 *   5. Create commitment envelope (prep, travel_there, anchor, travel_back, recovery)
 *   6. Convert chain steps to TimeBlocks with metadata
 *   7. Return ExecutionChain
 * 
 * Requirements: 4.1, 4.2, 7.1, 7.2, 7.3, 7.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */
```

**Key Methods**:

- `generateChainsForDate()`: Main entry point for chain generation
- `calculateChainCompletionDeadline()`: Calculates deadline using formula: `anchor.start - travel - 45min`
- `generateBackwardChain()`: Works backward from deadline to assign step times
- `generateCommitmentEnvelope()`: Creates 5-block envelope (prep, travel_there, anchor, travel_back, recovery)

**Example**:

```typescript
// Generate chains for today
const chains = await chainGenerator.generateChainsForDate(
  anchors,
  {
    userId: 'user-123',
    date: new Date(),
    config: {
      currentLocation: homeLocation,
      userEnergy: 3,
    }
  }
);

// Each chain includes:
// - chain_id: unique identifier
// - anchor: the fixed commitment
// - chain_completion_deadline: when chain must complete
// - steps: array of chain steps with timing
// - commitment_envelope: prep, travel, anchor, return, recovery
```

### 2. Location State Calculation

**Location**: `src/lib/chains/location-state.ts`

**Purpose**: Track whether user is at home or not based on commitment envelopes.

**Algorithm Steps**:

```typescript
/**
 * Location State Calculation Algorithm
 * 
 * 1. Start with location_state = at_home at planStart
 * 2. For each chain (sorted by start time):
 *    - When travel_there starts: location_state = not_home
 *    - When travel_back ends + recovery completes: location_state = at_home
 * 3. Calculate home intervals:
 *    - Start with full day (planStart to sleepTime)
 *    - Subtract all commitment envelopes (prep through recovery)
 *    - Remaining periods = home intervals
 * 4. Filter home intervals:
 *    - Keep only intervals >= 30 minutes
 *    - Discard shorter intervals (too short for meals)
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 17.1, 17.2, 17.3, 17.4
 */
```

**Key Methods**:

- `calculateLocationPeriods()`: Tracks state transitions throughout the day
- `calculateHomeIntervals()`: Extracts at_home periods and filters by minimum duration
- `isHomeInterval()`: Checks if a given time falls within a home interval
- `getLocationStateAt()`: Returns location state at a specific time

**Example**:

```typescript
// Calculate location periods
const locationPeriods = locationStateTracker.calculateLocationPeriods(
  chains,
  planStart,
  sleepTime
);

// Calculate home intervals (>= 30 minutes)
const homeIntervals = locationStateTracker.calculateHomeIntervals(
  locationPeriods,
  30 // minimum duration in minutes
);

// Check if time is in home interval
const isHome = locationStateTracker.isHomeInterval(
  new Date('2025-02-01T12:00:00Z'),
  homeIntervals
);
```

### 3. Degradation Logic

**Location**: `src/lib/chains/degradation-service.ts`

**Purpose**: Handle chain degradation when running late by dropping optional steps.

**Algorithm Steps**:

```typescript
/**
 * Degradation Algorithm
 * 
 * 1. Check if degradation should trigger:
 *    - Trigger when current time > Chain Completion Deadline
 * 2. If triggered, degrade chain:
 *    - For each step:
 *      - If can_skip_when_late = true AND is_required = false:
 *        - Mark status = 'skipped'
 *        - Set skip_reason = "Running late"
 *      - Otherwise:
 *        - Preserve step (keep in chain)
 * 3. Return degraded chain with:
 *    - Optional steps marked as skipped
 *    - Required steps preserved
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */
```

**Key Methods**:

- `shouldTriggerDegradation()`: Checks if current time exceeds deadline
- `degradeChain()`: Drops optional steps while preserving required steps
- `getDroppedSteps()`: Returns list of steps that were dropped
- `areRequiredStepsPreserved()`: Validates that all required steps remain

**Example**:

```typescript
// Check if degradation should trigger
if (degradationService.shouldTriggerDegradation(chain, currentTime)) {
  // Degrade chain (drop optional steps)
  const degradedChain = degradationService.degradeChain(chain);
  
  // Get list of dropped steps
  const droppedSteps = degradationService.getDroppedSteps(chain, degradedChain);
  console.log('Dropped steps:', droppedSteps); // ['Shower', 'Pack bag']
  
  // Verify required steps preserved
  const preserved = degradationService.areRequiredStepsPreserved(degradedChain);
  console.log('Required steps preserved:', preserved); // true
}
```

### 4. Chain Status Tracking

**Location**: `src/lib/chains/chain-status-service.ts`

**Purpose**: Track chain execution status and determine success/failure based on chain integrity.

**Algorithm Steps**:

```typescript
/**
 * Chain Status Evaluation Algorithm
 * 
 * 1. Determine chain state:
 *    - Not started: status = 'pending'
 *    - Started but not complete: status = 'in-progress'
 *    - Complete with all required steps: status = 'completed'
 *    - Complete but missing required steps: status = 'failed'
 * 
 * 2. Evaluate chain integrity:
 *    - Intact: All required steps completed
 *    - Broken: One or more required steps missing
 * 
 * 3. Determine success/failure:
 *    - Late but complete → SUCCESS (chain integrity intact)
 *    - On time but missing steps → FAILURE (chain integrity broken)
 * 
 * 4. Generate status message:
 *    - SUCCESS: "You made it! Chain completed late but intact."
 *    - FAILURE: "Chain broke at [step]. Let's try again tomorrow."
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 20.1, 20.2, 20.3, 20.4, 20.5
 */
```

**Key Methods**:

- `updateChainStatus()`: Updates chain status based on current execution state
- `evaluateChainStatus()`: Returns detailed status result with integrity assessment
- `getChainIntegrity()`: Returns 'intact' or 'broken' based on required step completion
- `shouldTriggerReplanning()`: Always returns false (momentum preservation)

**Example**:

```typescript
// Evaluate chain status
const statusResult = chainStatusService.evaluateChainStatus(chain, currentTime);

console.log(statusResult);
// {
//   status: 'completed',
//   chain_integrity: 'intact',
//   message: 'You made it! Chain completed late but intact.',
//   completed_steps: ['Feed cat', 'Bathroom', 'Hygiene', 'Dress', 'Leave'],
//   missing_steps: [],
//   was_late: true
// }

// Check if replanning should trigger (always false for momentum preservation)
const shouldReplan = chainStatusService.shouldTriggerReplanning(chain);
console.log(shouldReplan); // false
```

### 5. Wake Ramp Generation

**Location**: `src/lib/chains/wake-ramp.ts`

**Purpose**: Generate wake-up ramp blocks based on energy level and timing.

**Algorithm Steps**:

```typescript
/**
 * Wake Ramp Generation Algorithm
 * 
 * 1. Check if wake ramp should be skipped:
 *    - Skip if planStart > wakeTime + 2 hours (already awake)
 *    - Otherwise, include wake ramp
 * 
 * 2. If not skipped, determine duration based on energy:
 *    - Low energy: 120 minutes (toilet 20, hygiene 10, shower 25, dress 20, buffer 45)
 *    - Medium energy: 90 minutes (toilet 20, hygiene 10, shower 25, dress 20, buffer 15)
 *    - High energy: 75 minutes (toilet 20, hygiene 10, shower 25, dress 20, buffer 0)
 * 
 * 3. Create wake ramp block:
 *    - start: planStart
 *    - end: planStart + duration
 *    - components: breakdown of time allocation
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */
```

**Key Methods**:

- `generateWakeRamp()`: Main entry point for wake ramp generation
- `shouldSkipWakeRamp()`: Checks if planStart > wakeTime + 2 hours
- `getComponentsForEnergy()`: Returns component breakdown based on energy level

**Example**:

```typescript
// Generate wake ramp
const wakeRamp = wakeRampGenerator.generateWakeRamp(
  planStart,
  wakeTime,
  'medium' // energy level
);

console.log(wakeRamp);
// {
//   start: Date('2025-02-01T08:00:00Z'),
//   end: Date('2025-02-01T09:30:00Z'),
//   duration: 90,
//   components: {
//     toilet: 20,
//     hygiene: 10,
//     shower: 25,
//     dress: 20,
//     buffer: 15
//   },
//   skipped: false
// }
```

## Error Handling Documentation

### Calendar Service Failures

**Location**: `src/lib/anchors/anchor-service.ts`

```typescript
/**
 * Calendar Service Error Handling
 * 
 * When calendar API is unavailable:
 * 1. Catch error in getAnchorsForDate()
 * 2. Log error with details (userId, date, error message)
 * 3. Return empty anchors array (graceful degradation)
 * 4. UI displays: "No calendar access. Showing basic plan."
 * 5. Plan generation continues with basic structure (Wake Ramp + meals + tasks)
 * 
 * Requirements: Design - Error Handling - Calendar Service Failures
 */
```

### Travel Service Failures

**Location**: `src/lib/chains/chain-generator.ts`

```typescript
/**
 * Travel Service Error Handling
 * 
 * When travel API fails to calculate duration:
 * 1. Catch error in getTravelDuration()
 * 2. Log error with details (anchorId, location, error message)
 * 3. Use fallback duration: 30 minutes (conservative estimate)
 * 4. Mark travel block with metadata: fallback_used = true
 * 5. UI displays: "Travel time estimated (service unavailable)"
 * 
 * Requirements: Design - Error Handling - Travel Service Failures
 */
```

### Chain Generation Failures

**Location**: `src/lib/chains/chain-generator.ts`

```typescript
/**
 * Chain Generation Error Handling
 * 
 * When chain template is missing for anchor type:
 * 1. Use default template (class template)
 * 2. Log warning with anchor type
 * 3. Mark chain with metadata: template_fallback = true
 * 4. Continue chain generation
 * 5. No UI warning (fallback is transparent)
 * 
 * Requirements: Design - Error Handling - Chain Generation Failures
 */
```

## Metadata Documentation

### TimeBlock Metadata Extension

**Location**: `src/types/daily-plan.ts`

```typescript
/**
 * TimeBlock Metadata Extension (V2)
 * 
 * V2 adds chain semantics to TimeBlock metadata without schema changes.
 * All chain information is stored in the metadata JSONB column.
 * 
 * New V2 fields:
 * - role: Chain semantics (type, required, chain_id, gate_conditions)
 * - chain_id: Links TimeBlock to ExecutionChain
 * - step_id: Links TimeBlock to ChainStepInstance
 * - anchor_id: Links TimeBlock to Anchor
 * - location_state: Current location ('at_home' | 'not_home')
 * - commitment_envelope: Envelope tracking (envelope_id, envelope_type)
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 18.1, 18.2, 18.3, 18.4, 18.5
 */
export interface TimeBlockMetadata {
  // V1.2 fields (existing)
  target_time?: string;
  placement_reason?: string;
  skip_reason?: string;
  
  // V2 Chain semantics fields
  role?: {
    type: 'anchor' | 'chain-step' | 'exit-gate' | 'recovery';
    required: boolean;
    chain_id?: string;
    gate_conditions?: GateCondition[];
  };
  chain_id?: string;
  step_id?: string;
  anchor_id?: string;
  location_state?: 'at_home' | 'not_home';
  commitment_envelope?: {
    envelope_id: string;
    envelope_type: 'prep' | 'travel_there' | 'anchor' | 'travel_back' | 'recovery';
  };
}
```

## Logging and Debugging

All V2 services include comprehensive logging for debugging:

### Anchor Service Logging

```typescript
// Log anchor classification
console.log('[Anchor Service] Classified anchor:', {
  eventId: event.id,
  title: event.title,
  type,
  location: event.location || 'none',
  start: new Date(event.start_time).toLocaleString(),
  end: new Date(event.end_time).toLocaleString(),
});
```

### Chain Generator Logging

```typescript
// Log chain generation steps
console.log('[Chain Generator] Starting chain generation for anchor:', {
  anchorId: anchor.id,
  title: anchor.title,
  type: anchor.type,
  start: anchor.start.toLocaleString(),
  location: anchor.location || 'none',
});

console.log('[Chain Generator] Travel duration calculated:', {
  anchorId: anchor.id,
  duration: travelDuration,
  fallbackUsed: travelFallbackUsed,
});

console.log('[Chain Generator] Chain Completion Deadline:', {
  anchorId: anchor.id,
  deadline: chainCompletionDeadline.toLocaleString(),
  anchorStart: anchor.start.toLocaleString(),
  bufferMinutes: CHAIN_COMPLETION_BUFFER_MINUTES,
});
```

### Location State Logging

```typescript
// Log location period calculation
console.log('[Location State] Starting location period calculation:', {
  planStart: planStart.toLocaleString(),
  sleepTime: sleepTime.toLocaleString(),
  chainCount: chains.length,
});

console.log('[Location State] Added at_home period:', {
  start: atHomePeriod.start.toLocaleString(),
  end: atHomePeriod.end.toLocaleString(),
  durationMinutes: Math.floor((atHomePeriod.end.getTime() - atHomePeriod.start.getTime()) / (1000 * 60)),
});
```

## Requirements Validation

All JSDoc comments include requirements validation references:

```typescript
/**
 * Calculate Chain Completion Deadline
 * 
 * Formula: anchor.start - travel_duration - 45 minutes
 * 
 * @param anchor - Anchor to calculate deadline for
 * @param travelDuration - Travel duration in minutes
 * @returns Chain completion deadline
 * 
 * Requirements: 4.1
 */
calculateChainCompletionDeadline(
  anchor: Anchor,
  travelDuration: number
): Date {
  const totalMinutes = travelDuration + CHAIN_COMPLETION_BUFFER_MINUTES;
  return new Date(anchor.start.getTime() - totalMinutes * 60 * 1000);
}
```

## Summary

All V2 code includes comprehensive inline documentation:

✅ **Class-level documentation**: Purpose and responsibilities
✅ **Method-level documentation**: Parameters, returns, requirements
✅ **Algorithm documentation**: Step-by-step explanations
✅ **Error handling documentation**: Failure scenarios and fallbacks
✅ **Metadata documentation**: Chain semantics and linkage
✅ **Logging documentation**: Debug output format
✅ **Requirements validation**: Traceability to requirements document

This documentation enables developers to:
- Understand the chain generation algorithm
- Debug location state calculation
- Implement degradation logic correctly
- Handle errors gracefully
- Trace code back to requirements
