# Requirements Document: Spine V1.1 (Post-Deployment Fixes)

## Introduction

Spine V1 is deployed and working. This spec addresses the gaps discovered during real usage:

**Problems Found:**
1. Plans generated after wake time show "All activities completed 🎉" at 3pm
2. Empty task list creates empty days
3. "Behind schedule" logic compares against skipped morning blocks
4. No metadata to distinguish "generated late" vs "generated on time"

**V1.1 Fixes:**
- Plan Start Anchor + Tail Plan (prevents empty afternoons)
- Primary Focus Block (prevents empty days)
- Meal blocks always exist (already done, verify)
- Plan metadata (tracks generation context)
- Behind schedule logic fix (ignore skipped blocks)
- Completion logic fix (only celebrate if truly done)

**Explicitly NOT in V1.1:**
- Timeline visualization
- Notifications
- Analytics
- Weather alerts
- Auto meal suggestions
- v5 integration

## Glossary

- **Plan_Start**: The effective start time of the plan (max of wake time and current time)
- **Tail_Plan**: Hardcoded activities generated when no blocks exist after plan start
- **Primary_Focus_Block**: Default 60-minute task when task list is empty
- **Generated_After_Now**: Boolean indicating plan was generated after wake time

## Requirements

### Requirement 1: Plan Start Anchor

**User Story:** As a user who generates plans at 3pm, I want the plan to start from now (not 7am), so that I don't see a bunch of skipped morning activities.

#### Acceptance Criteria

1. WHEN generating a plan THEN the System SHALL calculate planStart = max(wakeTime, now)
2. WHEN planStart > wakeTime THEN the System SHALL set generated_after_now = true
3. WHEN planStart > wakeTime THEN the System SHALL NOT include activities before planStart
4. WHEN displaying the plan THEN the System SHALL show planStart as the effective start time
5. WHEN planStart = wakeTime THEN the System SHALL set generated_after_now = false

### Requirement 2: Tail Plan Generation

**User Story:** As a user who generates plans late in the day, I want the system to fill the remaining time with reasonable activities, so that I don't see "All activities completed 🎉" at 3pm.

#### Acceptance Criteria

1. WHEN no time blocks exist after planStart THEN the System SHALL generate a Tail Plan
2. WHEN generating Tail Plan THEN the System SHALL include Reset/Admin block (10 minutes)
3. WHEN generating Tail Plan AND energy ≠ low THEN the System SHALL include Primary Focus Block (60 minutes)
4. WHEN generating Tail Plan THEN the System SHALL include Dinner block (45 minutes)
5. WHEN generating Tail Plan THEN the System SHALL include Evening Routine block (20 minutes)

### Requirement 3: Primary Focus Block

**User Story:** As a user with an empty task list, I want a default "Primary Focus Block" scheduled, so that my day has structure even when I haven't curated tasks.

#### Acceptance Criteria

1. WHEN task fetch returns 0 tasks THEN the System SHALL insert Primary Focus Block
2. WHEN inserting Primary Focus Block THEN the System SHALL set duration to 60 minutes
3. WHEN inserting Primary Focus Block THEN the System SHALL set energy cost to medium
4. WHEN inserting Primary Focus Block THEN the System SHALL name it "Primary Focus Block"
5. WHEN tasks exist THEN the System SHALL NOT insert Primary Focus Block

### Requirement 4: Plan Metadata

**User Story:** As a developer debugging plan behavior, I want metadata about when and how the plan was generated, so that I can understand why certain blocks are missing.

#### Acceptance Criteria

1. WHEN generating a plan THEN the System SHALL record generated_at timestamp
2. WHEN generating a plan THEN the System SHALL record generated_after_now boolean
3. WHEN planStart > wakeTime THEN the System SHALL set generated_after_now = true
4. WHEN planStart = wakeTime THEN the System SHALL set generated_after_now = false
5. WHEN displaying plan THEN the System SHALL use metadata to explain missing morning blocks

### Requirement 5: Behind Schedule Logic Fix

**User Story:** As a user who generated a plan at 3pm, I don't want "Degrade Plan" offered just because morning blocks are skipped, so that degradation only triggers when I'm actually behind.

#### Acceptance Criteria

1. WHEN calculating behind schedule THEN the System SHALL only consider blocks after planStart
2. WHEN calculating behind schedule THEN the System SHALL ignore blocks with status = 'skipped'
3. WHEN now > currentBlock.endTime + 30min THEN the System SHALL consider user behind schedule
4. WHEN all blocks before now are skipped THEN the System SHALL NOT consider user behind schedule
5. WHEN user is behind schedule THEN the System SHALL offer "Degrade Plan" button

### Requirement 6: Completion Logic Fix

**User Story:** As a user who completed all activities after planStart, I want celebration only when truly done, so that I don't see "All activities completed 🎉" at 3pm when evening activities remain.

#### Acceptance Criteria

1. WHEN checking completion THEN the System SHALL only consider blocks after planStart
2. WHEN no pending blocks exist after now THEN the System SHALL check plan status
3. WHEN plan status = 'degraded' THEN the System SHALL NOT show completion celebration
4. WHEN pending blocks exist after now THEN the System SHALL NOT show completion celebration
5. WHEN all blocks after now are complete AND status ≠ 'degraded' THEN the System SHALL show completion celebration

### Requirement 7: Evening Routine Placement

**User Story:** As a user with an evening routine, I want it scheduled after 6pm (not at 3pm), so that it makes sense as an evening activity.

#### Acceptance Criteria

1. WHEN scheduling evening routine THEN the System SHALL place it as the last non-buffer block
2. WHEN scheduling evening routine THEN the System SHALL NOT schedule it before 18:00
3. WHEN sleep time < 18:00 THEN the System SHALL schedule evening routine before sleep time
4. WHEN evening routine is scheduled THEN the System SHALL add buffer after it
5. WHEN evening routine doesn't fit THEN the System SHALL drop it (don't force it)

### Requirement 8: Meal Blocks Verification

**User Story:** As a user who needs to eat, I want meal blocks always included in my plan, so that I don't skip meals due to poor planning.

#### Acceptance Criteria

1. WHEN generating a plan THEN the System SHALL include Breakfast block (15 minutes)
2. WHEN generating a plan THEN the System SHALL include Lunch block (30 minutes)
3. WHEN generating a plan THEN the System SHALL include Dinner block (45 minutes)
4. WHEN planStart > breakfast time THEN the System SHALL skip breakfast block
5. WHEN planStart > lunch time THEN the System SHALL skip lunch block

### Requirement 9: Sequencer Source of Truth

**User Story:** As a developer maintaining the sequencer, I want it to derive state from time_blocks.status only, so that there's no index drift.

#### Acceptance Criteria

1. WHEN getting current block THEN the System SHALL query time_blocks where status='pending'
2. WHEN getting next blocks THEN the System SHALL query time_blocks after current where status='pending'
3. WHEN marking block complete THEN the System SHALL update time_blocks.status only
4. WHEN sequence updates THEN the System SHALL NOT update any separate index field
5. WHEN displaying sequence THEN the System SHALL derive from time_blocks.status in real-time

### Requirement 10: Delete Plan

**User Story:** As a user who wants to start over, I want to delete my current plan, so that I can generate a fresh one.

#### Acceptance Criteria

1. WHEN I click "Delete Plan" THEN the System SHALL confirm before deleting
2. WHEN I confirm deletion THEN the System SHALL delete the plan and all time blocks
3. WHEN plan is deleted THEN the System SHALL show plan generation form
4. WHEN plan is deleted THEN the System SHALL NOT show "All activities completed 🎉"
5. WHEN plan is deleted THEN the System SHALL allow immediate regeneration
