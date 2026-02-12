# Requirements Document: Spine V1.2 (Meal Scheduling Fix)

## Introduction

V1.1 is deployed. Meals exist in plans, but they're being scheduled incorrectly — all three meals appear immediately after wake time (Breakfast 07:35, Lunch 07:55, Dinner 08:30) because they're treated as normal flex activities.

**The Bug:**
Meals are inserted into the activity list and scheduled in the first available slots, ignoring human meal timing.

**The Fix:**
Add meal-specific scheduling constraints:
1. Time windows (breakfast 06:30-11:30, lunch 11:30-15:30, dinner 17:00-21:30)
2. Minimum spacing (3 hours between meals)
3. Anchor-aware placement (schedule around commitments, not before them)

**Explicitly NOT in V1.2:**
- Meal suggestions based on inventory
- Meal complexity optimization
- Nutritional tracking
- Recipe integration
- Any other meal features

This is a surgical fix to make meal timing sane.

## Glossary

- **Meal_Window**: Valid time range for scheduling a meal (e.g., breakfast 06:30-11:30)
- **Meal_Spacing**: Minimum time gap between meals (3 hours)
- **Anchor**: Fixed commitment (class, appointment) that constrains meal placement
- **Default_Meal_Time**: Fallback time when no anchors exist (breakfast 09:30, lunch 13:00, dinner 19:00)

## Requirements

### Requirement 1: Meal Time Windows

**User Story:** As a user, I want meals scheduled at reasonable times, so that I don't see "Breakfast, Lunch, Dinner" all before 9am.

#### Acceptance Criteria

1. WHEN scheduling breakfast THEN the System SHALL only place it between 06:30 and 11:30
2. WHEN scheduling lunch THEN the System SHALL only place it between 11:30 and 15:30
3. WHEN scheduling dinner THEN the System SHALL only place it between 17:00 and 21:30
4. WHEN current time is past a meal window THEN the System SHALL mark that meal as skipped
5. WHEN a meal cannot fit in its window THEN the System SHALL mark it as skipped with reason "No valid slot in window"

### Requirement 2: Minimum Meal Spacing

**User Story:** As a user, I want meals spaced at least 3 hours apart, so that I don't see lunch scheduled 20 minutes after breakfast.

#### Acceptance Criteria

1. WHEN scheduling meals THEN the System SHALL enforce minimum 3-hour gap between meals
2. WHEN breakfast ends at 09:00 THEN the System SHALL NOT schedule lunch before 12:00
3. WHEN lunch ends at 13:00 THEN the System SHALL NOT schedule dinner before 16:00
4. WHEN spacing constraint cannot be met THEN the System SHALL skip the later meal
5. WHEN calculating spacing THEN the System SHALL use meal end times (not start times)

### Requirement 3: Anchor-Aware Meal Placement

**User Story:** As a user with classes and appointments, I want meals scheduled around my commitments, so that I don't have dinner at 8:30am before my 5pm seminar.

#### Acceptance Criteria

1. WHEN commitments exist THEN the System SHALL schedule meals around them (not before them)
2. WHEN scheduling breakfast THEN the System SHALL place it near wake time if within breakfast window
3. WHEN scheduling lunch THEN the System SHALL place it after morning commitments or around 12:30
4. WHEN scheduling dinner THEN the System SHALL place it after evening commitments or around 19:00
5. WHEN no commitments exist THEN the System SHALL use default meal times (breakfast 09:30, lunch 13:00, dinner 19:00)

### Requirement 4: Meal Placement After Anchors

**User Story:** As a developer implementing meal scheduling, I want meals placed after commitments and travel blocks are scheduled, so that meal timing respects hard constraints.

#### Acceptance Criteria

1. WHEN building the plan THEN the System SHALL schedule commitments first
2. WHEN building the plan THEN the System SHALL schedule travel blocks second
3. WHEN building the plan THEN the System SHALL schedule meals third (using constraints)
4. WHEN building the plan THEN the System SHALL schedule tasks and routines fourth
5. WHEN meals are placed THEN the System SHALL insert them at chosen times (not append to end)

### Requirement 5: Default Meal Times

**User Story:** As a user generating a plan with no commitments, I want meals at normal human times, so that my day looks boring and sane.

#### Acceptance Criteria

1. WHEN no commitments exist AND wake time < 09:00 THEN the System SHALL schedule breakfast at 09:30
2. WHEN no commitments exist AND wake time >= 09:00 THEN the System SHALL schedule breakfast at wake + 45 minutes (clamped to window)
3. WHEN no commitments exist THEN the System SHALL schedule lunch at 13:00
4. WHEN no commitments exist THEN the System SHALL schedule dinner at 19:00
5. WHEN default times violate spacing THEN the System SHALL adjust later meals forward

### Requirement 6: Meal Skipping Logic

**User Story:** As a user who generates plans late in the day, I want missed meal windows handled gracefully, so that I don't see breakfast scheduled at 3pm.

#### Acceptance Criteria

1. WHEN current time > 11:30 THEN the System SHALL skip breakfast
2. WHEN current time > 15:30 THEN the System SHALL skip lunch
3. WHEN current time > 21:30 THEN the System SHALL skip dinner
4. WHEN a meal is skipped THEN the System SHALL set status='skipped' and skip_reason='Past meal window'
5. WHEN a meal is skipped THEN the System SHALL NOT create a time block for it

### Requirement 7: Meal Placement Algorithm

**User Story:** As a developer, I want a clear meal placement algorithm, so that meal scheduling is predictable and debuggable.

#### Acceptance Criteria

1. WHEN placing meals THEN the System SHALL use this algorithm:
   - Calculate target time for each meal (based on anchors or defaults)
   - Clamp target time to meal window
   - Check spacing constraint with previous meal
   - Find available slot near target time
   - If no slot found, mark meal as skipped
2. WHEN calculating target time THEN the System SHALL consider anchors first, defaults second
3. WHEN finding available slot THEN the System SHALL search ±30 minutes from target time
4. WHEN no slot found in search range THEN the System SHALL mark meal as skipped
5. WHEN meal is placed THEN the System SHALL insert it at the chosen time (not append)

### Requirement 8: Wake Time Default Improvement

**User Story:** As a user generating plans, I want the wake time to default to a sensible value, so that I don't accidentally generate a 7am plan when it's 2pm.

#### Acceptance Criteria

1. WHEN generating a plan AND current time < 12:00 THEN the System SHALL default wake time to 07:00
2. WHEN generating a plan AND current time >= 12:00 THEN the System SHALL default wake time to current time rounded down to nearest 15 minutes
3. WHEN user overrides wake time THEN the System SHALL use the provided value
4. WHEN wake time is in the past THEN the System SHALL use planStart = max(wakeTime, now)
5. WHEN displaying wake time input THEN the System SHALL show the calculated default

### Requirement 9: Meal Block Metadata

**User Story:** As a developer debugging meal placement, I want metadata about why meals were placed or skipped, so that I can verify the algorithm works correctly.

#### Acceptance Criteria

1. WHEN a meal is scheduled THEN the System SHALL record target_time in metadata
2. WHEN a meal is scheduled THEN the System SHALL record placement_reason ('anchor-aware' or 'default')
3. WHEN a meal is skipped THEN the System SHALL record skip_reason ('Past meal window', 'No valid slot', 'Spacing constraint')
4. WHEN debugging THEN the System SHALL log meal placement decisions
5. WHEN displaying plan THEN the System SHALL show meal placement metadata in debug mode

### Requirement 10: Meal Scheduling Verification

**User Story:** As a developer, I want automated tests that verify meal scheduling works correctly, so that I catch regressions.

#### Acceptance Criteria

1. WHEN running tests THEN the System SHALL verify meals respect time windows
2. WHEN running tests THEN the System SHALL verify meals respect spacing constraints
3. WHEN running tests THEN the System SHALL verify meals are anchor-aware
4. WHEN running tests THEN the System SHALL verify late generation skips past meals
5. WHEN running tests THEN the System SHALL verify no-commitment plans use default times
