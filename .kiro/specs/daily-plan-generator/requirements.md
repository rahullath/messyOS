# Requirements Document

## Introduction

The Daily Plan Generator is the core spine of MessyOS — a friction-reduction prosthetic that converts reality into survivable day structure. This system exists to prevent unplanned time, which leads to paralysis, guilt, and shutdown. The generator takes actual conditions (wake time, energy, weather, commitments) and produces time-blocked plans with explicit sequencing, buffers, and fallback strategies.

This is NOT a productivity optimizer. It is a harm-reduction system that prioritizes preventing day collapse over maximizing achievement.

## Glossary

- **Daily_Plan_Generator**: The core system that produces structured daily schedules
- **Time_Block**: A scheduled period with start time, end time, activity, and buffer
- **Exit_Time**: The explicit time when the user must leave their current location to arrive on time
- **Fallback_Plan**: An alternative sequence of activities if the primary plan fails
- **Energy_State**: User's current energy level (low, medium, high)
- **Fixed_Commitment**: Non-negotiable scheduled events (classes, appointments)
- **Sequencing**: The ordered list of activities that must happen in a specific order
- **Buffer**: Extra time added between activities to account for transitions and delays
- **Degradation**: The process of simplifying a plan when the user falls behind

## Requirements

### Requirement 1: Daily Plan Generation

**User Story:** As a time-blind user, I want the system to generate a complete daily plan based on my actual wake time and current conditions, so that I have explicit structure and don't experience paralysis from unplanned time.

#### Acceptance Criteria

1. WHEN I input my actual wake time THEN the Daily_Plan_Generator SHALL create a time-blocked schedule from wake to sleep
2. WHEN I provide my energy state THEN the Daily_Plan_Generator SHALL adjust task difficulty and sequencing accordingly
3. WHEN I have fixed commitments THEN the Daily_Plan_Generator SHALL schedule around them with appropriate travel and preparation buffers
4. WHEN the plan is generated THEN the Daily_Plan_Generator SHALL include no more than 3 "real" tasks per day
5. WHEN the plan is generated THEN the Daily_Plan_Generator SHALL ensure all tasks are finishable in one session

### Requirement 2: Exit Time Calculation

**User Story:** As a user who frequently misses trains and appointments due to time-blindness, I want explicit exit times calculated for all commitments, so that I know exactly when to leave and can avoid being late.

#### Acceptance Criteria

1. WHEN I have a fixed commitment THEN the Daily_Plan_Generator SHALL calculate the exact exit time from my current location
2. WHEN calculating exit time THEN the Daily_Plan_Generator SHALL factor in travel method (bike, train, walk), weather conditions, and preparation time
3. WHEN exit time approaches THEN the Daily_Plan_Generator SHALL provide countdown notifications (30 min, 15 min, 5 min)
4. WHEN I'm running late THEN the Daily_Plan_Generator SHALL recalculate exit time and suggest faster travel alternatives
5. WHEN travel conditions change THEN the Daily_Plan_Generator SHALL update exit time and notify me of changes

### Requirement 3: Activity Sequencing

**User Story:** As a user who struggles with context-switching and decision paralysis, I want an explicit ordered sequence of activities, so that I always know "what should happen next" without having to decide.

#### Acceptance Criteria

1. WHEN the plan is generated THEN the Daily_Plan_Generator SHALL provide a numbered sequence of activities in execution order
2. WHEN I complete an activity THEN the Daily_Plan_Generator SHALL automatically show the next activity in sequence
3. WHEN activities have dependencies THEN the Daily_Plan_Generator SHALL enforce correct ordering (e.g., shower before gym, not after)
4. WHEN I skip an activity THEN the Daily_Plan_Generator SHALL adjust the sequence and mark it as "skipped" not "failed"
5. WHEN the sequence is disrupted THEN the Daily_Plan_Generator SHALL offer to resequence remaining activities

### Requirement 4: Buffer and Transition Time

**User Story:** As a user who underestimates transition time, I want explicit buffers between activities, so that I don't create impossible schedules that guarantee failure.

#### Acceptance Criteria

1. WHEN scheduling activities THEN the Daily_Plan_Generator SHALL add transition buffers between all activities (minimum 5 minutes)
2. WHEN scheduling travel THEN the Daily_Plan_Generator SHALL add preparation buffers (getting ready, packing, finding keys)
3. WHEN scheduling meals THEN the Daily_Plan_Generator SHALL include cooking time, eating time, and cleanup time
4. WHEN scheduling personal care THEN the Daily_Plan_Generator SHALL include all steps (shower, skincare, dressing) not just the main activity
5. WHEN buffers are insufficient THEN the Daily_Plan_Generator SHALL flag the schedule as "tight" and suggest adjustments

### Requirement 5: Fallback Plan Generation

**User Story:** As a user whose days often derail after one missed activity, I want automatic fallback plans, so that a single failure doesn't cause complete day collapse.

#### Acceptance Criteria

1. WHEN the primary plan is generated THEN the Daily_Plan_Generator SHALL also generate a fallback plan with reduced scope
2. WHEN I fall behind schedule THEN the Daily_Plan_Generator SHALL offer to switch to the fallback plan
3. WHEN generating fallback plans THEN the Daily_Plan_Generator SHALL preserve fixed commitments and drop optional activities
4. WHEN I activate a fallback plan THEN the Daily_Plan_Generator SHALL recalculate all exit times and buffers
5. WHEN the fallback plan is activated THEN the Daily_Plan_Generator SHALL mark it as "degraded mode" not "failure"

### Requirement 6: Weather-Aware Planning

**User Story:** As a Birmingham UK student who cycles to university, I want weather-aware travel recommendations, so that I don't make over-optimistic cycling decisions that result in arriving soaked or missing trains.

#### Acceptance Criteria

1. WHEN planning travel THEN the Daily_Plan_Generator SHALL check Birmingham weather forecast for the travel time window
2. WHEN rain is forecast THEN the Daily_Plan_Generator SHALL recommend train over bike and adjust exit time accordingly
3. WHEN temperature is below 5°C THEN the Daily_Plan_Generator SHALL add extra preparation time for winter clothing
4. WHEN weather changes after plan generation THEN the Daily_Plan_Generator SHALL notify me and suggest plan adjustments
5. WHEN I override weather recommendations THEN the Daily_Plan_Generator SHALL add extra buffer time for weather-related delays

### Requirement 7: Energy-Aware Task Scheduling

**User Story:** As a user with depression and inconsistent energy levels, I want task scheduling that respects my current energy state, so that I don't set myself up for failure with unrealistic expectations.

#### Acceptance Criteria

1. WHEN I report low energy THEN the Daily_Plan_Generator SHALL schedule only essential tasks and add extra rest buffers
2. WHEN I report medium energy THEN the Daily_Plan_Generator SHALL schedule a balanced mix of essential and optional tasks
3. WHEN I report high energy THEN the Daily_Plan_Generator SHALL schedule up to 3 real tasks plus routine activities
4. WHEN energy state changes during the day THEN the Daily_Plan_Generator SHALL offer to replan remaining activities
5. WHEN I consistently report low energy THEN the Daily_Plan_Generator SHALL suggest reducing baseline task load

### Requirement 8: Integration with Existing Systems

**User Story:** As a user with existing tasks, habits, calendar events, and routines, I want the Daily Plan Generator to integrate all these inputs, so that I have one unified plan instead of multiple disconnected systems.

#### Acceptance Criteria

1. WHEN generating a plan THEN the Daily_Plan_Generator SHALL pull fixed commitments from the calendar system
2. WHEN generating a plan THEN the Daily_Plan_Generator SHALL include habit tracking activities (medication, gym, substance logging)
3. WHEN generating a plan THEN the Daily_Plan_Generator SHALL schedule routine activities (morning routine, evening routine)
4. WHEN generating a plan THEN the Daily_Plan_Generator SHALL select up to 3 tasks from the task system based on due dates and energy level
5. WHEN generating a plan THEN the Daily_Plan_Generator SHALL integrate meal planning (breakfast, lunch, dinner) with appropriate cooking times

### Requirement 9: Plan Degradation

**User Story:** As a user who often falls behind schedule, I want graceful plan degradation, so that the system helps me salvage the day instead of making me feel like I've failed completely.

#### Acceptance Criteria

1. WHEN I'm 30+ minutes behind schedule THEN the Daily_Plan_Generator SHALL offer to simplify the remaining plan
2. WHEN degrading a plan THEN the Daily_Plan_Generator SHALL preserve fixed commitments and drop optional activities
3. WHEN degrading a plan THEN the Daily_Plan_Generator SHALL suggest which activities to skip based on importance and energy cost
4. WHEN a plan is degraded THEN the Daily_Plan_Generator SHALL recalculate all remaining time blocks and buffers
5. WHEN a plan is degraded THEN the Daily_Plan_Generator SHALL mark skipped activities as "deferred" not "failed"

### Requirement 10: Morning Routine Integration

**User Story:** As a user with a complex morning routine (skincare, hair care, oral care), I want the Daily Plan Generator to schedule all routine steps with realistic timing, so that I don't underestimate morning time and miss my exit window.

#### Acceptance Criteria

1. WHEN I have a 9am class THEN the Daily_Plan_Generator SHALL work backward from exit time to calculate wake time
2. WHEN scheduling morning routine THEN the Daily_Plan_Generator SHALL include all steps (shower, skincare, hair, oral care, dressing, breakfast)
3. WHEN I have early commitments THEN the Daily_Plan_Generator SHALL suggest which routine steps can be streamlined or skipped
4. WHEN I consistently run late THEN the Daily_Plan_Generator SHALL suggest adjusting wake time or simplifying routine
5. WHEN morning routine is complete THEN the Daily_Plan_Generator SHALL confirm I'm on track for exit time

### Requirement 11: Gym and Exercise Integration

**User Story:** As a user who goes to the gym regularly, I want gym sessions scheduled optimally around my class schedule and energy levels, so that I maintain consistency without exhausting myself before important commitments.

#### Acceptance Criteria

1. WHEN I have 9am classes THEN the Daily_Plan_Generator SHALL schedule gym before class (6:30-8:00am) and suggest train travel
2. WHEN I have afternoon classes THEN the Daily_Plan_Generator SHALL offer gym options (morning or post-class)
3. WHEN scheduling gym THEN the Daily_Plan_Generator SHALL include travel time, workout time, shower time, and post-workout recovery buffer
4. WHEN I'm low energy THEN the Daily_Plan_Generator SHALL suggest skipping gym or reducing workout intensity
5. WHEN gym is at Selly Oak THEN the Daily_Plan_Generator SHALL optimize travel routing (gym → stores → home)

### Requirement 12: Meal Planning Integration

**User Story:** As a user who often skips meals due to poor planning, I want meal times explicitly scheduled with cooking and cleanup time, so that I eat consistently and don't lie to myself about "quick meals."

#### Acceptance Criteria

1. WHEN generating a plan THEN the Daily_Plan_Generator SHALL schedule breakfast (10 min), lunch (20-30 min), and dinner (30-45 min)
2. WHEN scheduling meals THEN the Daily_Plan_Generator SHALL include cooking time, eating time, and cleanup time
3. WHEN I have limited time THEN the Daily_Plan_Generator SHALL suggest meals from my inventory that match the time constraint
4. WHEN I have no food THEN the Daily_Plan_Generator SHALL schedule grocery shopping before meal preparation
5. WHEN I skip a meal THEN the Daily_Plan_Generator SHALL adjust energy expectations for remaining activities

### Requirement 13: Academic Deadline Awareness

**User Story:** As a student with assignment deadlines, I want the Daily Plan Generator to schedule study sessions around my other commitments, so that I make progress without overwhelming myself.

#### Acceptance Criteria

1. WHEN I have upcoming deadlines THEN the Daily_Plan_Generator SHALL suggest study sessions in available time slots
2. WHEN deadlines are urgent THEN the Daily_Plan_Generator SHALL increase study session frequency and duration
3. WHEN I'm low energy THEN the Daily_Plan_Generator SHALL schedule lighter study tasks (reading, note review) over heavy tasks (essay writing)
4. WHEN I have multiple deadlines THEN the Daily_Plan_Generator SHALL prioritize based on due date and estimated work remaining
5. WHEN study sessions are scheduled THEN the Daily_Plan_Generator SHALL include break time and avoid scheduling before high-energy commitments

### Requirement 14: Plan Visualization

**User Story:** As a visual thinker, I want to see my daily plan as a timeline with color-coded blocks, so that I can quickly understand my day structure at a glance.

#### Acceptance Criteria

1. WHEN viewing the plan THEN the Daily_Plan_Generator SHALL display a vertical timeline from wake to sleep
2. WHEN displaying activities THEN the Daily_Plan_Generator SHALL use color coding (fixed commitments, tasks, routines, meals, travel, buffers)
3. WHEN displaying the current time THEN the Daily_Plan_Generator SHALL show a "now" indicator on the timeline
4. WHEN I'm behind schedule THEN the Daily_Plan_Generator SHALL highlight affected time blocks in warning colors
5. WHEN I complete activities THEN the Daily_Plan_Generator SHALL mark them as complete on the timeline

### Requirement 15: Plan Persistence and History

**User Story:** As a user who wants to understand my patterns, I want daily plans saved with completion data, so that I can see what actually works and what consistently fails.

#### Acceptance Criteria

1. WHEN a plan is generated THEN the Daily_Plan_Generator SHALL save it to the database with timestamp
2. WHEN I complete activities THEN the Daily_Plan_Generator SHALL record actual completion times vs planned times
3. WHEN I skip activities THEN the Daily_Plan_Generator SHALL record skip reasons (low energy, ran late, changed mind)
4. WHEN I view plan history THEN the Daily_Plan_Generator SHALL show completion rates by activity type
5. WHEN patterns emerge THEN the Daily_Plan_Generator SHALL suggest adjustments (earlier wake time, longer buffers, fewer tasks)
