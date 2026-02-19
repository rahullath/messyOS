# Requirements Document: Spine V1.3 (Wake Ramp + Location Awareness)

## Introduction

V1.2 fixed meal timing, but the plan still doesn't map to physical reality:

**Problems:**
1. **No wake-up ramp** - Plan assumes you can "start life" immediately (wake 12:00 → lunch 12:30)
2. **No location awareness** - Meals scheduled while you're at university or commuting
3. **No return travel** - You go to class but never come back home

**V1.3 Fixes:**
- Wake Ramp (75-120 min startup: toilet, shower, hygiene, dress)
- Commitment Envelopes (prep + travel + event + return + recovery)
- Location State (at_home vs not_home, meals require home)

**Explicitly NOT in V1.3:**
- Full geolocation tracking
- Complex location modeling
- Multi-stop routing
- Location-based notifications

This is surgical: add 3 primitives that make plans map to physical reality.

## Glossary

- **Wake_Ramp**: Mandatory startup block after wake (toilet, shower, hygiene, dress)
- **Commitment_Envelope**: Full cycle for calendar event (prep + travel + event + return + recovery)
- **Location_State**: Simple boolean (at_home vs not_home)
- **Home_Interval**: Time period when location_state = at_home
- **Return_Travel**: Travel block from commitment location back home
- **Recovery_Buffer**: Decompression time after returning home (10-20 min)

## Requirements

### Requirement 1: Wake Ramp Block

**User Story:** As a user who needs time to become functional, I want a wake-up ramp scheduled immediately after wake, so that the plan doesn't pretend I can start activities instantly.

#### Acceptance Criteria

1. WHEN generating a plan THEN the System SHALL add Wake Ramp block immediately after planStart
2. WHEN adding Wake Ramp THEN the System SHALL set duration to 75-120 minutes (based on energy)
3. WHEN energy = low THEN the System SHALL use 120-minute Wake Ramp
4. WHEN energy = medium THEN the System SHALL use 90-minute Wake Ramp
5. WHEN energy = high THEN the System SHALL use 75-minute Wake Ramp

### Requirement 2: Wake Ramp Components

**User Story:** As a developer, I want to understand what the Wake Ramp represents, so that I can explain it to users and adjust it later.

#### Acceptance Criteria

1. WHEN creating Wake Ramp THEN the System SHALL model it as single block (not separate steps in V1.3)
2. WHEN storing Wake Ramp THEN the System SHALL include metadata about components:
   - Toilet/dump: 20 min
   - Oral hygiene: 10 min
   - Shower: 25 min
   - Skincare + dress: 20 min
   - Buffer: 10 min
3. WHEN displaying Wake Ramp THEN the System SHALL show it as "Wake Ramp" or "Morning Startup"
4. WHEN Wake Ramp is complete THEN the System SHALL mark location_state = at_home
5. WHEN Wake Ramp exists THEN the System SHALL NOT schedule other activities during it

### Requirement 3: Commitment Envelopes

**User Story:** As a user with classes and appointments, I want the full cycle modeled (prep, travel there, event, travel back, recovery), so that the plan reflects the actual time cost of commitments.

#### Acceptance Criteria

1. WHEN scheduling a commitment THEN the System SHALL create an envelope with 5 blocks:
   - Prep block (15-25 min)
   - Travel there block (from travel service)
   - Commitment block (calendar event)
   - Travel back block (same duration as travel there)
   - Recovery buffer (10-20 min)
2. WHEN creating prep block THEN the System SHALL use 15 min default, 25 min for seminars/workshops
3. WHEN creating travel back THEN the System SHALL use same duration as travel there (reversed route or fallback)
4. WHEN creating recovery buffer THEN the System SHALL use 10 min default, 20 min for long commitments (>2 hours)
5. WHEN envelope is complete THEN the System SHALL mark location_state = at_home after recovery

### Requirement 4: Location State Tracking

**User Story:** As a user, I want meals scheduled only when I'm home, so that I don't see "Dinner 18:30" while I'm literally at university.

#### Acceptance Criteria

1. WHEN generating plan THEN the System SHALL track location_state for each time period
2. WHEN planStart begins THEN the System SHALL set location_state = at_home
3. WHEN travel there begins THEN the System SHALL set location_state = not_home
4. WHEN travel back ends + recovery complete THEN the System SHALL set location_state = at_home
5. WHEN displaying plan THEN the System SHALL show location_state in debug mode

### Requirement 5: Meal Placement with Location

**User Story:** As a user, I want meals scheduled only during home intervals, so that meal timing respects where I actually am.

#### Acceptance Criteria

1. WHEN placing meals THEN the System SHALL only consider home intervals
2. WHEN no home interval exists in meal window THEN the System SHALL skip meal or mark as "portable suggestion"
3. WHEN commitment envelope ends THEN the System SHALL consider time after recovery as home interval
4. WHEN multiple commitments exist THEN the System SHALL identify gaps between envelopes as home intervals
5. WHEN meal cannot fit in home interval THEN the System SHALL mark skip_reason = "No home interval in window"

### Requirement 6: Home Intervals Calculation

**User Story:** As a developer, I want a clear algorithm for calculating home intervals, so that meal placement is predictable.

#### Acceptance Criteria

1. WHEN calculating home intervals THEN the System SHALL use this algorithm:
   - Start with full day (planStart to sleepTime)
   - Subtract all commitment envelopes (prep through recovery)
   - Remaining periods = home intervals
2. WHEN home interval < 30 minutes THEN the System SHALL ignore it (too short for meal)
3. WHEN home interval >= 30 minutes THEN the System SHALL consider it valid for meal placement
4. WHEN displaying plan THEN the System SHALL log home intervals for debugging
5. WHEN no home intervals exist THEN the System SHALL mark all meals as skipped or portable

### Requirement 7: Return Travel Calculation

**User Story:** As a user, I want return travel calculated automatically, so that I don't have to manually add "get home" blocks.

#### Acceptance Criteria

1. WHEN commitment has location THEN the System SHALL calculate return travel
2. WHEN calculating return travel THEN the System SHALL use same duration as outbound travel
3. WHEN travel service provides route THEN the System SHALL use actual duration
4. WHEN travel service fails THEN the System SHALL use outbound duration as fallback
5. WHEN commitment has no location THEN the System SHALL skip return travel (assume at home)

### Requirement 8: Recovery Buffer

**User Story:** As a user with ADHD, I want decompression time after returning home, so that the plan doesn't immediately schedule the next activity.

#### Acceptance Criteria

1. WHEN return travel ends THEN the System SHALL add recovery buffer
2. WHEN commitment duration < 2 hours THEN the System SHALL use 10-minute recovery
3. WHEN commitment duration >= 2 hours THEN the System SHALL use 20-minute recovery
4. WHEN recovery buffer ends THEN the System SHALL mark location_state = at_home
5. WHEN displaying recovery THEN the System SHALL label it "Recovery" or "Decompress"

### Requirement 9: Generation Order

**User Story:** As a developer, I want a clear generation order, so that location-aware placement works correctly.

#### Acceptance Criteria

1. WHEN generating plan THEN the System SHALL follow this order:
   1. Calculate planStart
   2. Add Wake Ramp
   3. Build commitment envelopes (prep + travel + event + return + recovery)
   4. Calculate home intervals
   5. Place meals in home intervals
   6. Place tasks in remaining home intervals
   7. Add evening routine
2. WHEN order is followed THEN the System SHALL have location_state for all time periods
3. WHEN placing activities THEN the System SHALL respect location constraints
4. WHEN conflicts occur THEN the System SHALL skip lower-priority activities (tasks before meals)
5. WHEN generation complete THEN the System SHALL validate no overlaps exist

### Requirement 10: Prep Block Duration

**User Story:** As a user, I want appropriate prep time before commitments, so that I'm not rushing to leave.

#### Acceptance Criteria

1. WHEN commitment type = "class" THEN the System SHALL use 15-minute prep
2. WHEN commitment type = "seminar" OR "workshop" THEN the System SHALL use 25-minute prep
3. WHEN commitment has no type THEN the System SHALL use 15-minute prep default
4. WHEN commitment location missing THEN the System SHALL use 25-minute prep (assume complex)
5. WHEN displaying prep THEN the System SHALL label it "Prep for [commitment name]"

### Requirement 11: Portable Meals

**User Story:** As a user who sometimes eats on campus, I want the option to mark meals as portable, so that they can be scheduled during not_home periods.

#### Acceptance Criteria

1. WHEN meal cannot fit in home interval THEN the System SHALL mark it as "portable suggestion" (not scheduled)
2. WHEN displaying portable suggestion THEN the System SHALL show it in UI with note "Consider portable meal"
3. WHEN user marks meal as portable THEN the System SHALL allow scheduling during not_home (V2 feature)
4. WHEN meal is portable suggestion THEN the System SHALL NOT create time block
5. WHEN meal is portable suggestion THEN the System SHALL store in metadata for future reference

### Requirement 12: Wake Ramp Skip Logic

**User Story:** As a user who generates plans late in the day, I want Wake Ramp skipped if I'm already awake and functional, so that it doesn't block the afternoon.

#### Acceptance Criteria

1. WHEN planStart > wakeTime + 2 hours THEN the System SHALL skip Wake Ramp
2. WHEN planStart = wakeTime THEN the System SHALL include Wake Ramp
3. WHEN Wake Ramp is skipped THEN the System SHALL set location_state = at_home immediately
4. WHEN Wake Ramp is skipped THEN the System SHALL log skip_reason = "Already awake"
5. WHEN displaying plan THEN the System SHALL not show skipped Wake Ramp

### Requirement 13: Evening Routine Location

**User Story:** As a user, I want evening routine scheduled at home, so that it doesn't conflict with being out.

#### Acceptance Criteria

1. WHEN scheduling evening routine THEN the System SHALL place it in last home interval
2. WHEN evening routine time < 18:00 THEN the System SHALL skip it (too early)
3. WHEN no home interval after 18:00 THEN the System SHALL skip evening routine
4. WHEN evening routine is placed THEN the System SHALL ensure location_state = at_home
5. WHEN evening routine cannot fit THEN the System SHALL mark skip_reason = "No home interval"

### Requirement 14: Commitment Envelope Metadata

**User Story:** As a developer debugging plans, I want metadata about commitment envelopes, so that I can verify they're built correctly.

#### Acceptance Criteria

1. WHEN creating envelope THEN the System SHALL store metadata:
   - envelope_id (links all 5 blocks)
   - envelope_type (prep, travel_there, commitment, travel_back, recovery)
   - commitment_id (original calendar event)
2. WHEN displaying envelope THEN the System SHALL show all 5 blocks grouped
3. WHEN debugging THEN the System SHALL log envelope construction
4. WHEN envelope is incomplete THEN the System SHALL log warning
5. WHEN querying plan THEN the System SHALL allow filtering by envelope_id

### Requirement 15: Location State Validation

**User Story:** As a developer, I want validation that location state is consistent, so that I catch bugs early.

#### Acceptance Criteria

1. WHEN plan is generated THEN the System SHALL validate location_state transitions
2. WHEN location_state = not_home THEN the System SHALL verify no meals scheduled
3. WHEN location_state = at_home THEN the System SHALL verify no travel blocks
4. WHEN validation fails THEN the System SHALL log error and fix automatically
5. WHEN displaying plan THEN the System SHALL show validation status
