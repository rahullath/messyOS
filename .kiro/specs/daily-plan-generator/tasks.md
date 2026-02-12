# Implementation Plan: Daily Plan Generator

## Overview

This implementation plan builds the Daily Plan Generator — the core spine of MessyOS that converts reality into survivable daily structure. The plan follows an incremental approach: database → core services → plan generation → UI → integration with existing v5 components.

## Tasks

- [ ] 1. Set up database schema and core data models
  - Create migration for `daily_plans`, `time_blocks`, `exit_times`, `plan_completions` tables
  - Create TypeScript interfaces for `DailyPlan`, `TimeBlock`, `Activity`, `ExitTime`
  - Add database utility functions for CRUD operations
  - _Requirements: 1.1, 15.1_

- [ ] 2. Implement Buffer Calculator service
  - [ ] 2.1 Create buffer calculator with transition, preparation, and travel buffer logic
    - Implement `calculateTransitionBuffer()` with 5-minute minimum
    - Implement `calculatePreparationBuffer()` for different activity types
    - Implement `calculateTravelBuffer()` with weather multipliers
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.2 Write unit tests for buffer calculator
    - Test minimum buffer enforcement
    - Test weather impact on buffers
    - Test different activity type buffers
    - _Requirements: 4.1, 4.5_

- [ ] 3. Implement Exit Time Calculator service
  - [ ] 3.1 Create exit time calculator with travel integration
    - Implement `calculateExitTime()` using travel service
    - Implement `recalculateExitTime()` for condition changes
    - Implement `getExitTimeAlerts()` for countdown notifications (30min, 15min, 5min)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.2 Write unit tests for exit time calculator
    - Test exit time calculation for different travel methods
    - Test recalculation when weather changes
    - Test alert generation at correct intervals
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. Implement Activity Sequencer service
  - [ ] 4.1 Create sequencer with dependency resolution
    - Implement `createSequence()` with topological sort for dependencies
    - Implement `resequence()` for handling skipped activities
    - Implement `validateSequence()` for circular dependency detection
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 Write unit tests for sequencer
    - Test dependency resolution (shower before gym)
    - Test resequencing after skipped activities
    - Test circular dependency detection
    - _Requirements: 3.1, 3.3_

- [ ] 5. Implement Plan Builder service (core logic)
  - [ ] 5.1 Create input gathering function
    - Implement `gatherInputs()` to pull from calendar, tasks, habits, routines, weather, meals
    - Handle missing or incomplete data gracefully
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 5.2 Create activity list builder
    - Implement `buildActivityList()` with energy-aware task selection
    - Limit to 3 tasks per day (1 for low energy, 2 for medium, 3 for high)
    - Include fixed commitments, routines, meals, habits
    - _Requirements: 1.4, 1.5, 7.1, 7.2, 7.3_

  - [ ] 5.3 Create time block generator
    - Implement `createTimeBlocks()` with buffer insertion
    - Handle fixed commitments vs flexible activities
    - Ensure no overlaps and respect wake/sleep times
    - _Requirements: 1.1, 4.1, 4.2, 4.3_

  - [ ] 5.4 Integrate exit time calculation into plan generation
    - Calculate exit times for all fixed commitments
    - Add travel blocks before commitments
    - _Requirements: 2.1, 2.2_

  - [ ]* 5.5 Write unit tests for plan builder
    - Test plan generation with low/medium/high energy
    - Test plan generation with multiple fixed commitments
    - Test plan generation with impossible schedules
    - _Requirements: 1.1, 1.4, 7.1, 7.2, 7.3_

- [ ] 6. Checkpoint - Ensure core services work together
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Fallback Plan Generator
  - [ ] 7.1 Create fallback generation logic
    - Implement `generateFallback()` that preserves fixed commitments
    - Drop optional tasks and simplify routines
    - Increase all buffers by 50%
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 7.2 Create fallback activation logic
    - Implement `shouldActivateFallback()` based on time delay
    - Trigger when 30+ minutes behind schedule
    - _Requirements: 9.1, 9.2_

  - [ ]* 7.3 Write unit tests for fallback generator
    - Test fallback preserves fixed commitments
    - Test fallback drops optional activities
    - Test fallback increases buffers
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8. Implement Plan Degradation service
  - [ ] 8.1 Create plan degradation logic
    - Implement `degradePlan()` that simplifies remaining activities
    - Preserve fixed commitments, drop optional tasks
    - Recalculate all time blocks and buffers
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 8.2 Write unit tests for plan degradation
    - Test degradation preserves fixed commitments
    - Test degradation recalculates buffers
    - Test skipped activities marked as "deferred" not "failed"
    - _Requirements: 9.1, 9.5_

- [ ] 9. Implement API endpoints
  - [ ] 9.1 Create POST /api/daily-plan/generate endpoint
    - Accept wake time, energy state, date
    - Call plan builder service
    - Return generated plan with fallback
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 9.2 Create GET /api/daily-plan/:date endpoint
    - Fetch existing plan for date
    - Return plan with current status
    - _Requirements: 15.1_

  - [ ] 9.3 Create PATCH /api/daily-plan/:id/activity/:activityId endpoint
    - Update activity status (completed, skipped)
    - Record actual times and skip reasons
    - _Requirements: 3.2, 3.4, 15.2, 15.3_

  - [ ] 9.4 Create POST /api/daily-plan/:id/degrade endpoint
    - Trigger plan degradation
    - Return degraded plan
    - _Requirements: 9.1, 9.2_

  - [ ] 9.5 Create POST /api/daily-plan/:id/activate-fallback endpoint
    - Activate fallback plan
    - Mark primary plan as abandoned
    - _Requirements: 5.4_

- [ ] 10. Checkpoint - Ensure API endpoints work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Create Daily Plan UI components
  - [ ] 11.1 Create DailyPlanGenerator component (input form)
    - Wake time picker
    - Energy state selector (low/medium/high)
    - "Generate Plan" button
    - _Requirements: 1.1, 1.2_

  - [ ] 11.2 Create DailyPlanTimeline component (visualization)
    - Vertical timeline from wake to sleep
    - Color-coded time blocks (commitments, tasks, routines, meals, travel, buffers)
    - "Now" indicator showing current time
    - Highlight blocks when behind schedule
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 11.3 Create ActivitySequence component (next action display)
    - Show current activity in sequence
    - Show next 2-3 activities
    - "Complete" and "Skip" buttons
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ] 11.4 Create ExitTimeAlert component (countdown display)
    - Show next exit time with countdown
    - Color-coded urgency (green > 30min, yellow 15-30min, red < 15min)
    - Travel method and weather info
    - _Requirements: 2.3, 2.4_

  - [ ] 11.5 Create FallbackPlanCard component
    - Show fallback plan summary
    - "Activate Fallback" button
    - Comparison with primary plan
    - _Requirements: 5.1, 5.4_

- [ ] 12. Create main Daily Plan page
  - [ ] 12.1 Create /daily-plan page
    - Check if plan exists for today
    - If not, show DailyPlanGenerator
    - If yes, show DailyPlanTimeline + ActivitySequence + ExitTimeAlert
    - _Requirements: 1.1, 14.1_

  - [ ] 12.2 Add real-time plan tracking
    - Update "now" indicator every minute
    - Check if behind schedule
    - Offer degradation when 30+ minutes late
    - _Requirements: 9.1, 14.3_

  - [ ] 12.3 Add plan completion tracking
    - Record activity completions
    - Record skip reasons
    - Calculate completion rate
    - _Requirements: 15.2, 15.3, 15.4_

- [ ] 13. Integrate with existing v5 components
  - [ ] 13.1 Integrate TravelOptimizer for exit time calculation
    - Use existing `travel-service.ts` for route calculation
    - Use existing `location-service.ts` for Birmingham-specific logic
    - _Requirements: 2.1, 2.2, 6.1, 6.2_

  - [ ] 13.2 Integrate MealPlanning for meal scheduling
    - Use existing `meal-planning-service.ts` for meal suggestions
    - Use existing `inventory-service.ts` for ingredient availability
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 13.3 Integrate RoutineTracker for routine scheduling
    - Use existing `routine-service.ts` for routine steps
    - Include morning and evening routines in plan
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 13.4 Integrate SubstanceTracker for habit scheduling
    - Include substance logging as scheduled activity
    - _Requirements: 8.2_

  - [ ] 13.5 Integrate BudgetManager (read-only)
    - Show budget status on plan page
    - No direct integration with plan generation
    - _Requirements: 8.2_

- [ ] 14. Update main dashboard to feature Daily Plan
  - [ ] 14.1 Add "Daily Plan" card to /dashboard
    - Show today's plan summary
    - Show next activity
    - Link to /daily-plan page
    - _Requirements: 1.1_

  - [ ] 14.2 Make Daily Plan the primary entry point
    - Prominent placement on dashboard
    - Quick access to plan generation
    - _Requirements: 1.1_

- [ ] 15. Implement plan history and analytics
  - [ ] 15.1 Create /daily-plan/history page
    - List past plans with completion rates
    - Filter by date range
    - _Requirements: 15.4_

  - [ ] 15.2 Create plan analytics service
    - Calculate average completion rate
    - Identify consistently skipped activities
    - Suggest adjustments (earlier wake time, longer buffers, fewer tasks)
    - _Requirements: 15.5_

  - [ ]* 15.3 Create analytics dashboard component
    - Show completion trends over time
    - Show most/least completed activity types
    - Show average delay by activity type
    - _Requirements: 15.4, 15.5_

- [ ] 16. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Integration tasks (13.x) leverage existing v5 components instead of rebuilding
- The Daily Plan Generator becomes the new spine that orchestrates all other modules
