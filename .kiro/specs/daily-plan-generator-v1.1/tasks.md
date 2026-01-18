# Implementation Plan: Spine V1.1 (Post-Deployment Fixes)

## Overview

Spine V1 is deployed. This plan fixes the gaps discovered during real usage. No scope creep — just making V1 actually usable.

**Target:** 1-2 sessions to fix critical issues.

## Tasks

- [x] 1. Add plan metadata to database
  - [x] 1.1 Create migration to add columns to daily_plans table
    - Add `generated_at TIMESTAMPTZ DEFAULT NOW()`
    - Add `generated_after_now BOOLEAN DEFAULT FALSE`
    - Add `plan_start TIMESTAMPTZ NOT NULL`
    - _Requirements: 4.1, 4.2_

  - [x] 1.2 Update TypeScript interfaces
    - Add fields to `DailyPlan` interface
    - Update plan builder to set these fields
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Implement Plan Start Anchor
  - [x] 2.1 Update plan builder to calculate planStart
    - Calculate `planStart = max(wakeTime, now)`
    - Set `generated_after_now = (planStart > wakeTime)`
    - Store planStart in database
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 2.2 Filter activities before planStart
    - Skip morning routine if planStart > routine end time
    - Skip breakfast if planStart > breakfast end time
    - Skip lunch if planStart > lunch end time
    - Only include activities that end after planStart
    - _Requirements: 1.3, 8.4, 8.5_

  - [ ]* 2.3 Write unit tests for plan start anchor
    - Test planStart calculation
    - Test generated_after_now flag
    - Test activity filtering
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Implement Tail Plan Generation
  - [x] 3.1 Detect when tail plan is needed
    - After building time blocks, check if any exist after planStart
    - If no blocks after planStart, trigger tail plan generation
    - _Requirements: 2.1_

  - [x] 3.2 Generate hardcoded tail plan
    - Add Reset/Admin block (10 minutes)
    - Add Primary Focus Block (60 minutes) if energy ≠ low
    - Add Dinner block (45 minutes)
    - Add Evening Routine block (20 minutes)
    - Add 5-minute buffers between all blocks
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.3 Write unit tests for tail plan
    - Test tail plan detection
    - Test tail plan generation
    - Test tail plan respects energy state
    - _Requirements: 2.1, 2.3_

- [x] 4. Implement Primary Focus Block
  - [x] 4.1 Update activity list builder
    - Check if task fetch returned 0 tasks
    - If 0 tasks, insert Primary Focus Block (60 min, medium energy)
    - If tasks exist, skip Primary Focus Block
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 Write unit tests for Primary Focus Block
    - Test insertion when task list empty
    - Test skipped when tasks exist
    - _Requirements: 3.1, 3.5_

- [x] 5. Fix Evening Routine Placement
  - [x] 5.1 Update time block generator
    - Schedule evening routine as last non-buffer block
    - Never schedule before 18:00 unless sleep time is earlier
    - Drop evening routine if it doesn't fit
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 5.2 Write unit tests for evening routine placement
    - Test placement after 18:00
    - Test placement with early sleep time
    - Test dropping when doesn't fit
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Fix Behind Schedule Logic
  - [x] 6.1 Update behind schedule calculation in UI
    - Get current block (first pending after planStart)
    - Check if now > currentBlock.endTime + 30 minutes
    - Ignore all skipped blocks
    - Only consider blocks after planStart
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 Update "Degrade Plan" button visibility
    - Show only when behind schedule (as calculated above)
    - Hide if no current block exists
    - Hide if all remaining blocks are after now
    - _Requirements: 5.5_

  - [ ]* 6.3 Write unit tests for behind schedule logic
    - Test calculation with skipped blocks
    - Test calculation with late generation
    - Test button visibility
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Fix Completion Logic
  - [x] 7.1 Update completion check in UI
    - Get all blocks after planStart
    - Filter to blocks after now
    - Check if any have status='pending'
    - Check if plan status ≠ 'degraded'
    - Show celebration only if no pending blocks AND status ≠ 'degraded'
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 7.2 Write unit tests for completion logic
    - Test with pending blocks after now
    - Test with degraded plan
    - Test with late generation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Verify Sequencer Source of Truth
  - [x] 8.1 Audit sequencer implementation
    - Verify getCurrentBlock queries time_blocks.status
    - Verify getNextBlocks queries time_blocks.status
    - Verify markBlockComplete only updates time_blocks.status
    - Verify no separate index tracking exists
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.2 Remove any separate index tracking if found
    - Remove currentIndex from database schema if exists
    - Remove currentIndex from TypeScript interfaces if exists
    - Update all queries to derive from time_blocks.status
    - _Requirements: 9.4_

- [x] 9. Implement Delete Plan
  - [x] 9.1 Add DELETE /api/daily-plan/:id endpoint
    - Delete all time_blocks for plan
    - Delete all exit_times for plan
    - Delete plan record
    - Return success
    - _Requirements: 10.2_

  - [x] 9.2 Add "Delete Plan" button to UI
    - Show button on plan page
    - Confirm before deleting ("Are you sure? This cannot be undone.")
    - Call DELETE endpoint
    - Redirect to plan generation form after deletion
    - _Requirements: 10.1, 10.3_

  - [ ]* 9.3 Write tests for delete plan
    - Test API endpoint deletes all related records
    - Test UI confirmation flow
    - Test redirect after deletion
    - _Requirements: 10.2, 10.3, 10.5_

- [x] 10. Verify Meal Blocks Always Exist
  - [x] 10.1 Audit plan builder
    - Verify breakfast block always added (unless planStart > breakfast time)
    - Verify lunch block always added (unless planStart > lunch time)
    - Verify dinner block always added
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 10.2 Fix if meal blocks missing
    - Add meal blocks to activity list builder if not present
    - Ensure meal blocks scheduled in gaps
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 11. Update UI to show plan context
  - [x] 11.1 Show plan start time
    - Display "Plan starts at [planStart]" if generated_after_now = true
    - Display "Plan starts at [wakeTime]" if generated_after_now = false
    - _Requirements: 1.4, 4.5_

  - [x] 11.2 Explain skipped morning blocks
    - If generated_after_now = true, show message:
      "Morning activities skipped (plan generated at [time])"
    - Don't show this message if generated_after_now = false
    - _Requirements: 4.5_

- [x] 12. End-to-end testing
  - [x] 12.1 Test late generation scenario
    - Generate plan at 3pm
    - Verify planStart = 3pm
    - Verify no morning blocks shown
    - Verify tail plan generated if needed
    - Verify "behind schedule" not triggered for skipped morning
    - Verify completion logic works correctly
    - _Requirements: 1.1, 2.1, 5.1, 6.1_

  - [x] 12.2 Test empty task list scenario
    - Generate plan with 0 tasks
    - Verify Primary Focus Block inserted
    - Verify day has structure
    - _Requirements: 3.1_

  - [x] 12.3 Test delete plan scenario
    - Generate plan
    - Delete plan
    - Verify plan generation form shown
    - Verify can regenerate immediately
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [x] 13. Final checkpoint - V1.1 complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster deployment
- Each task references specific requirements for traceability
- Focus on fixing real usage issues, not adding features
- No timeline, no notifications, no analytics — those are V2
- Target: 1-2 sessions to get V1 actually usable

## What's Explicitly NOT in V1.1

- Timeline visualization
- Countdown notifications
- Plan history and analytics
- Weather-change alerts
- Auto meal suggestions
- v5 component integration
- AI chat UI
- Grocy/Firefly/Vikunja integrations

This is surgical fixes only. V1.1 makes V1 usable, nothing more.
