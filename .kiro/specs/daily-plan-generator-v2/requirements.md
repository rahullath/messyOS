# Requirements Document: Chain-Based Execution Engine (V2)

## Introduction

V1.2 works but optimizes the wrong thing. It fills time instead of preserving dependencies. This creates "fake days" that don't map to how ADHD/autistic users actually function.

**Core Problem:**
Bed-rot isn't caused by lack of motivation. It's caused by **chain breakage under time pressure**. When one required task is forgotten, rushed, or partially completed → the system enters an unrecoverable state (avoidance + paralysis).

**V2 Paradigm Shift:**
- **Traditional planners**: Timeline-first (fill the day, optimize duration, schedule adherence)
- **V2 (CBE)**: Chain-first (preserve dependencies, anchor-relative deadlines, chain integrity)

**What V2 Keeps from V1.2:**
- Exit times calculation (becomes Chain Completion Deadline)
- Calendar → Commitment → Travel pipeline (becomes Anchor Parser)
- Transition buffers (becomes State Transitions)
- Current/Next UI (becomes Chain View)
- Degradation logic (becomes "Drop non-required chain steps when late")

**What V2 Adds:**
- Chain semantics on existing TimeBlocks
- Anchor-driven chain generation (reverse builder from anchors)
- Exit Readiness Gate (boolean checklist: keys, phone, meds, cat fed)
- Recovery buffers as first-class chain steps
- Meals as chain-support (optional by default)
- Timeline as secondary visualization (not truth)

**What V2 Salvages from V1.3:**
- Wake Ramp concept (startup sequence)
- Commitment Envelopes (prep + travel + event + return + recovery)
- Location awareness (home vs not_home)
- Recovery buffers after travel

**Explicitly NOT in V2:**
- Full rewrite of plan-builder
- Removal of time blocks
- New "engine" folder from scratch
- Complex geolocation tracking
- Multi-stop routing

This is append-only iteration, not a pivot.

## Glossary

- **Anchor**: Fixed external commitment (class, appointment, train departure) - hard constraint
- **Execution_Chain**: Linearized dependency path required to safely reach an anchor
- **Chain_Step**: Single node in execution chain (e.g., "Feed cat", "Shower", "Pack bag")
- **Chain_Integrity**: Property where chain completes in order, even if duration exceeds estimates
- **Exit_Readiness_Gate**: Boolean gate that must be satisfied before "Leave" step (keys, phone, meds, etc.)
- **Anchor_Relative_Deadline** (ARD): Completion deadline relative to anchor (e.g., T-45 minutes before anchor)
- **Recovery_Buffer**: Required state transition after travel or anchor (decompression, not optional break)
- **Chain_Completion_Deadline**: Time by which all pre-anchor chain steps must complete
- **Wake_Ramp**: Mandatory startup sequence after wake (toilet, shower, hygiene, dress)
- **Commitment_Envelope**: Full cycle for anchor (prep + travel + anchor + return + recovery)
- **Location_State**: Simple boolean (at_home vs not_home)
- **Home_Interval**: Time period when location_state = at_home
- **Momentum_Preservation**: Rule that chain overruns don't trigger replanning mid-flow

## Requirements

### Requirement 1: Anchor Parser

**User Story:** As a user with calendar commitments, I want them automatically classified as anchors, so that my day is organized around immovable events.

#### Acceptance Criteria

1. WHEN generating a plan THEN the System SHALL pull today's calendar events
2. WHEN processing calendar events THEN the System SHALL classify each as an anchor
3. WHEN classifying anchors THEN the System SHALL extract start time, location, type (lecture/tutorial/seminar/workshop)
4. WHEN anchor has location THEN the System SHALL mark must_attend = true
5. WHEN anchor has no location THEN the System SHALL mark must_attend = false (assume optional/remote)

### Requirement 2: Chain Templates

**User Story:** As a user with ADHD, I want predefined execution chains for different anchor types, so that I don't have to remember all the steps every time.

#### Acceptance Criteria

1. WHEN anchor type = "class" THEN the System SHALL generate chain: Feed cat → Bathroom → Hygiene → Shower (optional) → Dress → Pack bag → Exit Gate → Leave → Travel → Anchor → Recovery
2. WHEN anchor type = "seminar" OR "workshop" THEN the System SHALL generate chain with extended prep (25 min instead of 15 min)
3. WHEN anchor type = "appointment" THEN the System SHALL generate chain: Bathroom → Hygiene → Dress → Pack bag → Exit Gate → Leave → Travel → Anchor → Recovery
4. WHEN anchor has no type THEN the System SHALL use default chain (class template)
5. WHEN defining chain steps THEN the System SHALL include duration_estimate, is_required, can_skip_when_late for each step

### Requirement 3: Exit Readiness Gate

**User Story:** As a user who forgets things when rushing, I want a checklist that must be satisfied before leaving, so that I don't forget keys, phone, meds, or umbrella.

#### Acceptance Criteria

1. WHEN generating chain THEN the System SHALL include Exit Readiness Gate before "Leave" step
2. WHEN Exit Gate is created THEN the System SHALL define conditions: keys present, phone charged >= 20%, water bottle filled, meds taken, cat fed, bag packed
3. WHEN Exit Gate is evaluated THEN the System SHALL return status = blocked OR ready
4. WHEN Exit Gate status = blocked THEN the System SHALL return blocked_reasons[] (list of unsatisfied conditions)
5. WHEN displaying Exit Gate THEN the System SHALL show checklist with manual toggles (no sensors in V2)

### Requirement 4: Anchor-Relative Deadlines

**User Story:** As a user with time blindness, I want deadlines expressed relative to anchors (T-45 minutes), so that I understand when I must be ready, not when each micro-task should happen.

#### Acceptance Criteria

1. WHEN anchor exists THEN the System SHALL calculate Chain Completion Deadline = anchor_start - travel_duration - 45 minutes
2. WHEN displaying chain THEN the System SHALL show "Complete chain by [time]" (not individual task times)
3. WHEN current time > Chain Completion Deadline THEN the System SHALL trigger degradation (drop optional steps)
4. WHEN chain steps overrun THEN the System SHALL NOT reschedule mid-flow (preserve momentum)
5. WHEN chain completes late but intact THEN the System SHALL mark as SUCCESS (chain integrity > punctuality)

### Requirement 5: Recovery Buffers as Chain Steps

**User Story:** As a user with ADHD, I want decompression time after travel and anchors, so that the system doesn't immediately schedule the next activity.

#### Acceptance Criteria

1. WHEN anchor ends THEN the System SHALL add Recovery Buffer as chain step (10-20 min)
2. WHEN anchor duration < 2 hours THEN the System SHALL use 10-minute recovery
3. WHEN anchor duration >= 2 hours THEN the System SHALL use 20-minute recovery
4. WHEN return travel ends THEN the System SHALL add Recovery Buffer before marking location_state = at_home
5. WHEN displaying recovery THEN the System SHALL label it "Recovery" or "Decompress" (not "Break")

### Requirement 6: Chain Semantics on TimeBlocks

**User Story:** As a developer, I want to add chain semantics to existing TimeBlocks without schema changes, so that I can iterate without breaking V1.2.

#### Acceptance Criteria

1. WHEN creating TimeBlock THEN the System SHALL add metadata field: role = { type, required, chain_id, gate_conditions }
2. WHEN role.type = 'anchor' THEN the TimeBlock represents an immovable event
3. WHEN role.type = 'chain-step' THEN the TimeBlock represents a dependency in execution chain
4. WHEN role.type = 'exit-gate' THEN the TimeBlock represents a boolean gate with conditions
5. WHEN role.type = 'recovery' THEN the TimeBlock represents a state transition buffer

### Requirement 7: Commitment Envelopes

**User Story:** As a user with classes and appointments, I want the full cycle modeled (prep, travel there, anchor, travel back, recovery), so that the plan reflects the actual time cost of commitments.

#### Acceptance Criteria

1. WHEN scheduling anchor THEN the System SHALL create envelope with 5 blocks: Prep → Travel There → Anchor → Travel Back → Recovery
2. WHEN creating prep block THEN the System SHALL use 15 min default, 25 min for seminars/workshops
3. WHEN creating travel back THEN the System SHALL use same duration as travel there
4. WHEN creating recovery buffer THEN the System SHALL use 10 min default, 20 min for long anchors (>2 hours)
5. WHEN envelope is complete THEN the System SHALL mark location_state = at_home after recovery

### Requirement 8: Location State Tracking

**User Story:** As a user, I want meals scheduled only when I'm home, so that I don't see "Dinner 18:30" while I'm at university.

#### Acceptance Criteria

1. WHEN generating plan THEN the System SHALL track location_state for each time period
2. WHEN planStart begins THEN the System SHALL set location_state = at_home
3. WHEN travel there begins THEN the System SHALL set location_state = not_home
4. WHEN travel back ends + recovery complete THEN the System SHALL set location_state = at_home
5. WHEN placing meals THEN the System SHALL only consider home intervals (location_state = at_home)

### Requirement 9: Wake Ramp Block

**User Story:** As a user who needs time to become functional, I want a wake-up ramp scheduled immediately after wake, so that the plan doesn't pretend I can start activities instantly.

#### Acceptance Criteria

1. WHEN generating plan THEN the System SHALL add Wake Ramp block immediately after planStart
2. WHEN adding Wake Ramp THEN the System SHALL set duration to 75-120 minutes (based on energy)
3. WHEN energy = low THEN the System SHALL use 120-minute Wake Ramp
4. WHEN energy = medium THEN the System SHALL use 90-minute Wake Ramp
5. WHEN energy = high THEN the System SHALL use 75-minute Wake Ramp

### Requirement 10: Wake Ramp Skip Logic

**User Story:** As a user who generates plans late in the day, I want Wake Ramp skipped if I'm already awake and functional, so that it doesn't block the afternoon.

#### Acceptance Criteria

1. WHEN planStart > wakeTime + 2 hours THEN the System SHALL skip Wake Ramp
2. WHEN planStart = wakeTime THEN the System SHALL include Wake Ramp
3. WHEN Wake Ramp is skipped THEN the System SHALL set location_state = at_home immediately
4. WHEN Wake Ramp is skipped THEN the System SHALL log skip_reason = "Already awake"
5. WHEN displaying plan THEN the System SHALL not show skipped Wake Ramp

### Requirement 11: Meals as Chain Support

**User Story:** As a user, I want meals to be optional chain-support activities (not chain drivers), so that my day doesn't feel fake with three meals before 9am.

#### Acceptance Criteria

1. WHEN generating chains THEN the System SHALL NOT include meals as required chain steps
2. WHEN placing meals THEN the System SHALL only schedule them in home intervals
3. WHEN no home interval exists in meal window THEN the System SHALL skip meal
4. WHEN user enables "meal scaffolding" THEN the System SHALL schedule up to 3 meals
5. WHEN user disables "meal scaffolding" (default) THEN the System SHALL schedule 0-1 meals in next feasible home window

### Requirement 12: Chain Generation from Anchors

**User Story:** As a developer, I want chains generated backward from anchors (not forward from wake time), so that the plan is anchor-driven.

#### Acceptance Criteria

1. WHEN generating plan THEN the System SHALL iterate through anchors for the day
2. WHEN processing anchor THEN the System SHALL generate backward chain to Chain Completion Deadline
3. WHEN calculating Chain Completion Deadline THEN the System SHALL use anchor_start - travel_duration - 45 minutes
4. WHEN chain is generated THEN the System SHALL create TimeBlocks for each chain step
5. WHEN multiple anchors exist THEN the System SHALL generate separate chains for each

### Requirement 13: Timeline as Secondary Visualization

**User Story:** As a user, I want the timeline to show what the chain looks like if everything goes smoothly, but not treat it as the truth of how my day must be lived.

#### Acceptance Criteria

1. WHEN displaying plan THEN the System SHALL show timeline as visualization (not primary interface)
2. WHEN displaying chain THEN the System SHALL show chain steps in dependency order (not time order)
3. WHEN chain overruns THEN the System SHALL NOT update timeline mid-flow
4. WHEN user views plan THEN the System SHALL emphasize chain view over timeline view
5. WHEN timeline conflicts with chain THEN the System SHALL prioritize chain integrity

### Requirement 14: Chain View UI

**User Story:** As a user executing my day, I want a chain view that shows next anchor, exit time, chain steps, and exit gate status, so that I know what to do and when I must be ready.

#### Acceptance Criteria

1. WHEN displaying chain view THEN the System SHALL show: Next Anchor (big), Exit time + "complete chain by T-45", Chain steps (checkbox style), Exit Gate status (blocked/reasons)
2. WHEN chain step is completed THEN the System SHALL mark it as done (checkbox)
3. WHEN Exit Gate is blocked THEN the System SHALL highlight blocked_reasons
4. WHEN Exit Gate is ready THEN the System SHALL show green "Ready to Leave"
5. WHEN no anchors exist THEN the System SHALL show "No anchors today" (not empty state)

### Requirement 15: Degradation Logic (Chain-Aware)

**User Story:** As a user running late, I want the system to drop optional chain steps (not reschedule everything), so that I can still complete the chain and reach my anchor.

#### Acceptance Criteria

1. WHEN current time > Chain Completion Deadline THEN the System SHALL trigger degradation
2. WHEN degradation triggers THEN the System SHALL drop optional chain steps (can_skip_when_late = true)
3. WHEN degradation triggers THEN the System SHALL preserve required chain steps
4. WHEN degradation triggers THEN the System SHALL NOT reschedule or replan mid-flow
5. WHEN displaying degraded chain THEN the System SHALL show dropped steps as "Skipped (running late)"

### Requirement 16: Momentum Preservation

**User Story:** As a user with ADHD, I want the system to not replan mid-flow when tasks overrun, so that I can maintain momentum once engaged.

#### Acceptance Criteria

1. WHEN chain step overruns THEN the System SHALL NOT trigger replanning
2. WHEN chain continues despite overrun THEN the System SHALL mark as in-progress
3. WHEN chain completes late but intact THEN the System SHALL mark as SUCCESS
4. WHEN chain completes on time but missing steps THEN the System SHALL mark as FAILURE
5. WHEN displaying chain status THEN the System SHALL show "Chain Integrity: Intact" or "Chain Integrity: Broken"

### Requirement 17: Home Intervals Calculation

**User Story:** As a developer, I want a clear algorithm for calculating home intervals, so that meal placement is predictable.

#### Acceptance Criteria

1. WHEN calculating home intervals THEN the System SHALL use this algorithm: Start with full day (planStart to sleepTime), Subtract all commitment envelopes (prep through recovery), Remaining periods = home intervals
2. WHEN home interval < 30 minutes THEN the System SHALL ignore it (too short for meal)
3. WHEN home interval >= 30 minutes THEN the System SHALL consider it valid for meal placement
4. WHEN displaying plan THEN the System SHALL log home intervals for debugging
5. WHEN no home intervals exist THEN the System SHALL mark all meals as skipped

### Requirement 18: Chain Metadata

**User Story:** As a developer debugging chains, I want metadata about chain construction, so that I can verify they're built correctly.

#### Acceptance Criteria

1. WHEN creating chain THEN the System SHALL store metadata: chain_id, anchor_id, chain_completion_deadline, steps[]
2. WHEN creating chain step THEN the System SHALL store metadata: step_id, chain_id, duration_estimate, is_required, can_skip_when_late
3. WHEN creating Exit Gate THEN the System SHALL store metadata: gate_conditions[], status, blocked_reasons[]
4. WHEN displaying chain THEN the System SHALL show all steps grouped by chain_id
5. WHEN debugging THEN the System SHALL log chain construction and validation

### Requirement 19: API Endpoint for Chain Generation

**User Story:** As a developer, I want a dedicated API endpoint for chain generation, so that I can separate chain logic from timeline logic.

#### Acceptance Criteria

1. WHEN calling GET /api/chains/today THEN the System SHALL return: anchors[], chains[], computed Chain Completion Deadlines
2. WHEN calling POST /api/chains/generate THEN the System SHALL accept date parameter and return chains for that date
3. WHEN generating chains THEN the System SHALL NOT require time blocks (chains are independent)
4. WHEN chains are generated THEN the System SHALL return JSON with chain_id, steps[], anchor_id, completion_deadline
5. WHEN API fails THEN the System SHALL return error with reason (e.g., "No calendar access")

### Requirement 20: Failure-Tolerant Success Criteria

**User Story:** As a user with ADHD, I want the system to define success as chain completion (not punctuality), so that I don't feel like a failure when tasks overrun.

#### Acceptance Criteria

1. WHEN chain completes late but intact THEN the System SHALL mark day as SUCCESS
2. WHEN chain completes on time but missing steps THEN the System SHALL mark day as FAILURE
3. WHEN displaying day summary THEN the System SHALL show "Chain Integrity: Intact" or "Chain Integrity: Broken"
4. WHEN chain integrity is intact THEN the System SHALL show positive message ("You made it!")
5. WHEN chain integrity is broken THEN the System SHALL show supportive message ("Chain broke at [step]. Let's try again tomorrow.")
