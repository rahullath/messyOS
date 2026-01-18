# Implementation Plan: Daily Plan Generator V1 (Spine Only)

## Overview

This is the **Spine V1** implementation — the absolute minimum to prove the core loop works. No fancy UI, no notifications, no analytics. Just: generate → next action → complete/skip → degrade.

**Target:** 1 week of focused work to get a usable spine.

## Tasks

- [x] 1. Set up database schema
  - Create migration for `daily_plans`, `time_blocks`, `exit_times` tables
  - Create TypeScript interfaces for `DailyPlan`, `TimeBlock`, `ExitTime`
  - Add database utility functions for CRUD operations
  - _Requirements: 9.1_

- [x] 2. Implement Exit Time Calculator (before plan builder)
  - [x] 2.1 Create exit time calculator using travel service
    - Call existing `travel-service.ts` for route
    - Add 15-minute preparation buffer
    - Calculate exit time (commitment start - travel - prep)
    - Return travel block duration and exit time
    - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2_

  - [x] 2.2 Add fallback for travel service failures
    - Use 30-minute default if travel service fails
    - Log error but don't block plan generation
    - _Requirements: 6.3_

  - [x]* 2.3 Write unit tests for exit time calculator
    - Test exit time calculation with travel service
    - Test fallback when travel service fails
    - _Requirements: 2.1, 6.1, 6.3_

- [x] 3. Implement Plan Builder service (core logic)
  - [x] 3.1 Create input gathering function
    - Fetch calendar commitments
    - Fetch pending tasks (limit 10)
    - Fetch active routines (with fallback to defaults if v5 service unavailable)
    - _Requirements: 5.1, 7.1, 10.1_

  - [x] 3.2 Create activity list builder
    - Add morning routine (if exists, else default 30min block)
    - Add fixed commitments with exit time calculation
    - Add meal blocks (breakfast 15min, lunch 30min, dinner 45min with cook/eat/cleanup)
    - Select 1-3 tasks based on energy (low=1, medium=2, high=3)
    - Add evening routine (if exists, else default 20min block)
    - _Requirements: 1.2, 7.2, 7.3, 10.2, 10.3, 10.4_

  - [x] 3.3 Create time block generator with pinned commitments + gap-fill
    - Place fixed commitments at their scheduled times first
    - For each commitment, add travel block and prep block before it
    - Fill gaps between commitments with routines, meals, and tasks
    - Add 5-minute transition buffers between all activities
    - Drop tasks if no space available (don't create overlaps)
    - Stop at sleep time
    - _Requirements: 1.1, 1.4, 1.5, 2.1_

  - [x] 3.4 Implement plan generation function
    - Call input gathering
    - Build activity list
    - Create time blocks (with exit times integrated)
    - Save to database
    - _Requirements: 1.1, 9.1_

  - [ ]* 3.5 Write unit tests for plan builder
    - Test plan generation with low/medium/high energy
    - Test task selection limits
    - Test gap-fill scheduling doesn't create overlaps
    - Test tasks dropped when no space
    - _Requirements: 1.2, 10.2, 10.3, 10.4_

- [x] 4. Implement Sequencer service (derive from time_blocks)
  - [x] 4.1 Create sequencer functions
    - Implement `getCurrentBlock()` - returns first pending block (status='pending')
    - Implement `getNextBlocks(n)` - returns next n pending blocks after current
    - Implement `markBlockComplete(blockId)` - updates status to 'completed'
    - No separate currentIndex needed - derive from time_blocks order
    - _Requirements: 3.1, 3.2, 3.3_

  - [x]* 4.2 Write unit tests for sequencer
    - Test getCurrentBlock returns first pending
    - Test getNextBlocks returns correct count
    - Test markBlockComplete updates status
    - Test sequence updates automatically after completion
    - _Requirements: 3.1, 3.2_

- [x] 5. Implement Plan Degradation
  - [x] 5.1 Create degradation function
    - Keep only fixed commitments, routines, and meals
    - Mark dropped tasks as "skipped" with reason "Dropped during degradation"
    - Recompute all buffers (don't keep old buffers)
    - Rebuild time blocks with new 5-minute transitions
    - Update plan status to "degraded"
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.2 Write unit tests for degradation
    - Test degradation preserves fixed commitments
    - Test degradation drops optional tasks
    - Test buffers are recomputed (not kept)
    - Test skipped activities marked correctly
    - _Requirements: 4.2, 4.3, 4.5_

- [x] 6. Checkpoint - Test core services with CLI/seed script
  - [x] 6.1 Create test script that calls services directly
    - Generate plan for today
    - Print plan to console (verify commitments, meals, routines, tasks, buffers)
    - Mark one activity complete
    - Verify getCurrentBlock advances automatically
    - Trigger degradation
    - Print degraded plan (verify buffers recomputed)
    - _Requirements: 1.1, 3.3, 4.1_

  - [x] 6.2 Verify core loop works without UI
    - Ensure plan generates correctly with gap-fill scheduling
    - Ensure no overlaps exist
    - Ensure sequencing works (derived from time_blocks)
    - Ensure degradation recomputes buffers
    - Ask user if questions arise

- [x] 7. Implement API endpoints
  - [x] 7.1 Create POST /api/daily-plan/generate endpoint
    - Accept wakeTime, sleepTime, energyState
    - Call plan builder service
    - Return generated plan with exit times
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 7.2 Create GET /api/daily-plan/today endpoint
    - Fetch today's plan for user
    - Return plan or null if doesn't exist
    - _Requirements: 8.2, 9.2_

  - [x] 7.3 Create PATCH /api/daily-plan/:id/activity/:activityId endpoint
    - Update activity status (completed/skipped)
    - Record skip reason if provided
    - Advance sequence if completed
    - _Requirements: 3.3, 3.4, 9.2, 9.3_

  - [x] 7.4 Create POST /api/daily-plan/:id/degrade endpoint
    - Call degradation service
    - Return degraded plan
    - _Requirements: 4.1, 9.4_

  - [ ]* 7.5 Test API endpoints with curl/Postman
    - Test plan generation
    - Test activity completion
    - Test degradation
    - _Requirements: 1.1, 3.3, 4.1_

- [x] 8. Create minimal UI components
  - [x] 8.1 Create PlanGeneratorForm component
    - Wake time picker (default 07:00)
    - Sleep time picker (default 23:00)
    - Energy state radio buttons (low/medium/high)
    - "Generate Plan" button
    - _Requirements: 8.1_

  - [x] 8.2 Create ActivityList component
    - Show all time blocks with start/end times
    - Highlight current activity (bold or background color)
    - Show "Complete" and "Skip" buttons for current activity
    - Show next 2 activities below current
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 8.3 Create ExitTimeDisplay component
    - Show exit times for all commitments
    - Show travel method and duration
    - Simple list format (no countdown)
    - _Requirements: 2.4, 2.5_

  - [x] 8.4 Create DegradePlanButton component
    - Show "Degrade Plan" button
    - Only show if current time > current activity end time + 30 minutes
    - Confirm before degrading
    - _Requirements: 4.1, 8.5_

- [x] 9. Create /daily-plan page
  - [x] 9.1 Create page layout
    - Check if plan exists for today
    - If not, show PlanGeneratorForm
    - If yes, show ActivityList + ExitTimeDisplay + DegradePlanButton
    - _Requirements: 8.1, 8.2_

  - [x] 9.2 Wire up API calls
    - Call POST /api/daily-plan/generate on form submit
    - Call GET /api/daily-plan/today on page load
    - Call PATCH endpoint on Complete/Skip
    - Call POST /api/daily-plan/:id/degrade on Degrade button
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 9.3 Add basic error handling
    - Show error message if plan generation fails
    - Show error message if API calls fail
    - Provide retry button
    - _Requirements: 8.1, 8.2_

- [x] 10. Add /daily-plan link to dashboard
  - [x] 10.1 Update src/layouts/DashboardLayout.astro navigation
    - Add "Daily Plan" link
    - Place it prominently (second item after Dashboard)
    - _Requirements: 8.1_

  - [x] 10.2 Add "Daily Plan" card to /dashboard
    - Show "Generate today's plan" if no plan exists
    - Show current activity if plan exists
    - Link to /daily-plan page
    - _Requirements: 8.1_

- [x] 11. Integration with existing v5 services
  - [x] 11.1 Integrate travel-service.ts for exit times
    - Import existing `src/lib/uk-student/travel-service.ts`
    - Use `getRoute()` function in exit time calculator
    - Fallback to 30-minute default if service fails
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 11.2 Integrate routine-service.ts for routines (with fallback)
    - Import existing `src/lib/uk-student/routine-service.ts`
    - Use `getActiveRoutines()` in plan builder
    - If service fails or no routines exist, use defaults:
      - Morning Routine: 30 minutes
      - Evening Routine: 20 minutes
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 11.3 Verify integrations work
    - Test plan generation with real calendar events
    - Test plan generation with real routines (if available)
    - Test plan generation with default routines (if v5 service unavailable)
    - Test exit time calculation with real locations
    - _Requirements: 5.1, 6.1, 7.1_

- [x] 12. End-to-end testing
  - [x] 12.1 Manual test: Complete user journey
    - Generate plan for today
    - Complete first activity
    - Skip second activity
    - Degrade plan
    - Verify all steps work
    - _Requirements: 1.1, 3.3, 3.4, 4.1_

  - [x] 12.2 Test with real data
    - Use actual calendar events
    - Use actual pending tasks
    - Use actual routines
    - Verify plan makes sense
    - _Requirements: 5.1, 7.1, 10.1_

  - [x] 12.3 Verify database persistence
    - Generate plan
    - Refresh page
    - Verify plan loads correctly
    - _Requirements: 9.1, 9.2_

- [x] 13. Final checkpoint - Spine V1 complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- **Critical:** Task 6 (CLI test) proves the spine works before building UI
- Integration tasks (11.x) use existing v5 services, no new code needed
- No timeline UI, no notifications, no analytics — those are V2
- Target: 1 week to get a usable spine that prevents day collapse

## What's Explicitly Deferred to V2

- Countdown notifications and alerts
- Timeline visualization (fancy UI)
- Plan history and analytics
- Weather-change notifications
- Meal auto-suggestions
- Substance tracker integration
- Budget overlays
- Rich UI polish (color-coded urgency, animations, etc.)

This is the thin spine. It's boring, minimal, and incomplete. But it prevents day collapse.
