# Requirements Document: Daily Plan Generator V1 (Spine Only)

## Introduction

This is the **Spine V1** — the absolute minimum Daily Plan Generator that prevents unplanned time and day collapse. This is NOT the full vision. This is the thin spine that proves the core loop works:

**Core Loop:** Generate plan → Show next action → Complete/Skip → Degrade when behind

**Explicitly Deferred to V2:**
- Countdown notifications and alerts
- Timeline visualization
- Plan history and analytics
- Weather-change notifications
- Meal auto-suggestions
- Substance tracker integration
- Budget overlays

**V1 Success Metric:** Can I generate a plan, follow "what's next?", and salvage a bad day?

## Glossary

- **Daily_Plan**: A sequence of time-blocked activities from wake to sleep
- **Time_Block**: Start time, end time, activity name, status
- **Next_Action**: The current activity in the sequence that needs doing
- **Degradation**: Simplifying the plan when behind schedule (drop optional tasks, preserve fixed commitments)
- **Fixed_Commitment**: Non-negotiable events (classes, appointments) from calendar
- **Buffer**: Transition time between activities (5-15 minutes)

## Requirements

### Requirement 1: Generate Daily Plan

**User Story:** As a time-blind user, I want to generate a daily plan based on wake time and energy, so that I have explicit structure for the day.

#### Acceptance Criteria

1. WHEN I provide wake time and energy state THEN the System SHALL generate a time-blocked plan from wake to sleep
2. WHEN generating a plan THEN the System SHALL include no more than 3 real tasks
3. WHEN generating a plan THEN the System SHALL pull fixed commitments from calendar
4. WHEN generating a plan THEN the System SHALL add 5-minute buffers between activities
5. WHEN generating a plan THEN the System SHALL create an ordered sequence of activities

### Requirement 2: Calculate Exit Times

**User Story:** As a user who misses trains, I want explicit exit times for commitments, so that I know when to leave.

#### Acceptance Criteria

1. WHEN I have a fixed commitment THEN the System SHALL calculate exit time from current location
2. WHEN calculating exit time THEN the System SHALL use travel service for duration
3. WHEN calculating exit time THEN the System SHALL add preparation buffer (10-15 minutes)
4. WHEN displaying exit time THEN the System SHALL show travel method and duration
5. WHEN I view the plan THEN the System SHALL show exit times for all commitments

### Requirement 3: Show Next Action

**User Story:** As a user with decision paralysis, I want to see "what's next" explicitly, so that I don't have to decide.

#### Acceptance Criteria

1. WHEN I view my plan THEN the System SHALL show the current activity in sequence
2. WHEN I view my plan THEN the System SHALL show the next 2 activities
3. WHEN I complete an activity THEN the System SHALL advance to the next activity
4. WHEN I skip an activity THEN the System SHALL mark it "skipped" and advance
5. WHEN all activities are done THEN the System SHALL show "Plan complete"

### Requirement 4: Degrade Plan When Behind

**User Story:** As a user who falls behind, I want to simplify my plan, so that I can salvage the day instead of giving up.

#### Acceptance Criteria

1. WHEN I'm 30+ minutes behind THEN the System SHALL offer to degrade the plan
2. WHEN degrading THEN the System SHALL preserve fixed commitments
3. WHEN degrading THEN the System SHALL drop optional tasks
4. WHEN degrading THEN the System SHALL recalculate remaining time blocks
5. WHEN degrading THEN the System SHALL mark skipped activities as "deferred" not "failed"

### Requirement 5: Integrate Calendar for Fixed Commitments

**User Story:** As a user with classes and appointments, I want them included in my plan, so that I don't miss them.

#### Acceptance Criteria

1. WHEN generating a plan THEN the System SHALL fetch today's calendar events
2. WHEN calendar events exist THEN the System SHALL include them as fixed commitments
3. WHEN calendar events have locations THEN the System SHALL calculate exit times
4. WHEN calendar events conflict THEN the System SHALL preserve them and schedule around them
5. WHEN no calendar events exist THEN the System SHALL generate a plan with tasks only

### Requirement 6: Integrate Travel Service for Exit Times

**User Story:** As a Birmingham UK student, I want exit times calculated using real travel data, so that they're accurate.

#### Acceptance Criteria

1. WHEN calculating exit time THEN the System SHALL use existing travel-service.ts
2. WHEN travel service returns route THEN the System SHALL use duration + prep time + buffer
3. WHEN travel service fails THEN the System SHALL use fallback estimate (30 minutes)
4. WHEN commitment has no location THEN the System SHALL skip exit time calculation
5. WHEN multiple commitments exist THEN the System SHALL calculate exit time for each

### Requirement 7: Integrate Routine Service for Morning/Evening

**User Story:** As a user with morning and evening routines, I want them included in my plan, so that I don't skip self-care.

#### Acceptance Criteria

1. WHEN generating a plan THEN the System SHALL fetch active routines from routine-service.ts
2. WHEN morning routine exists THEN the System SHALL schedule it after wake time
3. WHEN evening routine exists THEN the System SHALL schedule it before sleep time
4. WHEN routines have steps THEN the System SHALL use total estimated duration
5. WHEN no routines exist THEN the System SHALL generate a plan without them

### Requirement 8: Simple List UI

**User Story:** As a user who needs to start using this today, I want a simple UI that shows my plan, so that I can follow it.

#### Acceptance Criteria

1. WHEN I visit /daily-plan THEN the System SHALL show plan generation form if no plan exists
2. WHEN I generate a plan THEN the System SHALL show ordered list of activities with times
3. WHEN viewing activities THEN the System SHALL highlight the current activity
4. WHEN viewing activities THEN the System SHALL show "Complete" and "Skip" buttons
5. WHEN I'm behind schedule THEN the System SHALL show "Degrade Plan" button

### Requirement 9: Plan Persistence

**User Story:** As a user who wants to track completion, I want my plan saved, so that I can see what I actually did.

#### Acceptance Criteria

1. WHEN I generate a plan THEN the System SHALL save it to database
2. WHEN I complete activities THEN the System SHALL update their status
3. WHEN I skip activities THEN the System SHALL record skip reason
4. WHEN I degrade a plan THEN the System SHALL save the degraded version
5. WHEN I view /daily-plan THEN the System SHALL load today's plan if it exists

### Requirement 10: Task Selection

**User Story:** As a user with pending tasks, I want the planner to select tasks for me, so that I don't have to decide.

#### Acceptance Criteria

1. WHEN generating a plan THEN the System SHALL fetch pending tasks from task system
2. WHEN energy is low THEN the System SHALL select 1 task maximum
3. WHEN energy is medium THEN the System SHALL select 2 tasks maximum
4. WHEN energy is high THEN the System SHALL select 3 tasks maximum
5. WHEN selecting tasks THEN the System SHALL prioritize by due date and energy cost
