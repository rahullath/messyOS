# Implementation Plan: Chain-Based Execution Engine (V2)

## Overview

This plan implements the Chain-Based Execution (CBE) paradigm on top of V1.2. The approach is append-only: add new components, modify plan-builder surgically, extend metadata. No rewrite.

Implementation follows this order:
1. Core chain infrastructure (Anchor Service, Chain Templates, Chain Generator)
2. Supporting services (Exit Gate, Location State, Wake Ramp)
3. Plan Builder integration (add chain generation step)
4. Chain View UI (primary interface)
5. API endpoints (chains endpoint)
6. Testing and validation

## Tasks

- [x] 1. Set up V2 directory structure and types
  - Create `src/lib/chains/` directory
  - Create `src/lib/anchors/` directory
  - Define core TypeScript interfaces in `src/lib/chains/types.ts`
  - Define Anchor interfaces in `src/lib/anchors/types.ts`
  - _Requirements: 1.1, 2.1, 6.1_

- [-] 2. Implement Anchor Service
  - [x] 2.1 Create Anchor Service class
    - Implement `getAnchorsForDate()` method
    - Implement `classifyAnchorType()` method
    - Add classification logic (lecture/class/seminar/workshop/appointment)
    - Add must_attend logic (location exists → true)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 Write unit tests for Anchor Service
    - Test classification for different event titles
    - Test must_attend logic with/without location
    - Test edge cases (empty title, missing fields)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.3 Write property test for Anchor Service
    - **Property 1: Anchor Classification Consistency**
    - **Validates: Requirements 1.4**

- [-] 3. Implement Chain Templates
  - [x] 3.1 Create chain templates file
    - Define ChainStep interface
    - Define ChainTemplate interface
    - Implement CHAIN_TEMPLATES for all anchor types (class, seminar, workshop, appointment, other)
    - Include duration_estimate, is_required, can_skip_when_late for each step
    - Add Exit Gate step with gate_tags
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.2 Write unit tests for chain templates
    - Test template structure for each anchor type
    - Test Exit Gate step inclusion
    - Test required vs optional step marking
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Implement Chain Generator
  - [x] 4.1 Create Chain Generator class
    - Implement `generateChainsForDate()` method
    - Implement `calculateChainCompletionDeadline()` method (anchor.start - travel - 45min)
    - Implement `generateBackwardChain()` method (work backward from deadline)
    - Add commitment envelope generation (prep, travel_there, anchor, travel_back, recovery)
    - Convert chain steps to TimeBlocks with metadata
    - _Requirements: 4.1, 4.2, 7.1, 7.2, 7.3, 7.4, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 4.2 Write unit tests for Chain Generator
    - Test Chain Completion Deadline calculation
    - Test backward chain generation
    - Test commitment envelope structure
    - Test TimeBlock conversion with metadata
    - _Requirements: 4.1, 7.1, 12.3, 12.4_

  - [ ]* 4.3 Write property tests for Chain Generator
    - **Property 2: Chain Completion Deadline Calculation**
    - **Property 3: Chain Step Ordering**
    - **Property 9: Commitment Envelope Completeness**
    - **Validates: Requirements 4.1, 12.4, 7.1**

- [x] 5. Checkpoint - Verify chain generation works
  - Ensure all tests pass, ask the user if questions arise.

- [-] 6. Implement Exit Readiness Gate
  - [x] 6.1 Create Exit Gate service
    - Define GateCondition interface
    - Define ExitGate interface
    - Implement DEFAULT_GATE_CONDITIONS (keys, phone, water, meds, cat-fed, bag-packed)
    - Implement `evaluateGate()` method (check all conditions, return status + blocked_reasons)
    - Implement `toggleCondition()` method (for UI interaction)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write unit tests for Exit Gate
    - Test gate evaluation with all conditions satisfied
    - Test gate evaluation with some conditions unsatisfied
    - Test blocked_reasons generation
    - Test condition toggling
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ]* 6.3 Write property test for Exit Gate
    - **Property 4: Exit Gate Blocking**
    - **Validates: Requirements 3.3, 3.4**

- [x] 7. Implement Location State Tracker
  - [x] 7.1 Create Location State service
    - Define LocationState type (at_home | not_home)
    - Define LocationPeriod interface
    - Define HomeInterval interface
    - Implement `calculateLocationPeriods()` method (track state transitions)
    - Implement `calculateHomeIntervals()` method (subtract envelopes from full day)
    - Implement `isHomeInterval()` method (check if time falls in home interval)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 17.1, 17.2, 17.3, 17.4_

  - [ ]* 7.2 Write unit tests for Location State
    - Test location period calculation with single anchor
    - Test location period calculation with multiple anchors
    - Test home interval calculation
    - Test home interval filtering (< 30 min excluded)
    - _Requirements: 8.2, 8.3, 8.4, 17.1, 17.2_

  - [ ]* 7.3 Write property tests for Location State
    - **Property 5: Location State Transitions**
    - **Property 12: Home Interval Minimum Duration**
    - **Validates: Requirements 8.2, 8.3, 8.4, 17.2**

- [x] 8. Implement Wake Ramp Generator
  - [x] 8.1 Create Wake Ramp service
    - Define WakeRamp interface
    - Implement `generateWakeRamp()` method (duration based on energy level)
    - Implement `shouldSkipWakeRamp()` method (skip if planStart > wakeTime + 2 hours)
    - Add duration logic (low: 120min, medium: 90min, high: 75min)
    - Add component breakdown (toilet, hygiene, shower, dress, buffer)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 8.2 Write unit tests for Wake Ramp
    - Test duration calculation for each energy level
    - Test skip logic with different planStart times
    - Test component breakdown
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 10.1, 10.2_

  - [ ]* 8.3 Write property test for Wake Ramp
    - **Property 7: Wake Ramp Skip Condition**
    - **Validates: Requirements 10.1**

- [x] 9. Checkpoint - Verify all services work independently
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Integrate chains into Plan Builder
  - [x] 10.1 Modify plan-builder.ts to add chain generation
    - Import Anchor Service, Chain Generator, Location State, Wake Ramp
    - Add chain generation step after planStart calculation
    - Add Wake Ramp generation (if not skipped)
    - Add location period calculation
    - Add home interval calculation
    - Keep existing timeline generation (demoted)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 10.2 Modify meal placement to respect home intervals
    - Update meal placement logic to check location_state
    - Only place meals in home intervals
    - Skip meals if no home interval in window
    - Add skip_reason = "No home interval" when skipped
    - _Requirements: 8.5, 11.2, 11.3, 17.5_

  - [x] 10.3 Update plan response to include chains
    - Add chains[] to DailyPlanResponse
    - Add home_intervals[] to DailyPlanResponse
    - Add wake_ramp to DailyPlanResponse
    - Add location_periods[] to DailyPlanResponse
    - _Requirements: 12.5, 18.1, 18.2, 18.3, 18.4_

  - [ ]* 10.4 Write integration tests for plan builder
    - Test plan generation with no anchors
    - Test plan generation with one anchor
    - Test plan generation with multiple anchors
    - Test meal placement with home intervals
    - Test Wake Ramp skip logic
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 10.5 Write property tests for plan builder integration
    - **Property 6: Home Interval Meal Placement**
    - **Property 13: Meal Scaffolding Default**
    - **Validates: Requirements 8.5, 11.2, 11.5**

- [x] 11. Checkpoint - Verify plan builder generates chains correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Create Chain View UI component
  - [x] 12.1 Create ChainView.tsx component
    - Display next anchor (prominent, large)
    - Display Chain Completion Deadline ("Complete chain by [time]")
    - Display chain steps (checkbox style)
    - Display Exit Gate status (blocked/ready with reasons)
    - Highlight current step
    - Add step completion handler
    - Add gate condition toggle handler
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 12.2 Add ChainView to daily plan page
    - Import ChainView component
    - Pass chain data from plan response
    - Add tab or section for chain view
    - Make chain view primary (timeline secondary)
    - _Requirements: 13.4, 14.1_

  - [ ]* 12.3 Write UI tests for ChainView
    - Test rendering with single chain
    - Test rendering with multiple chains
    - Test step completion interaction
    - Test gate condition toggling
    - Test blocked gate display
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [-] 13. Implement degradation logic (chain-aware)
  - [x] 13.1 Add degradation service
    - Implement `shouldTriggerDegradation()` method (current time > Chain Completion Deadline)
    - Implement `degradeChain()` method (drop optional steps, preserve required)
    - Mark dropped steps with status = 'skipped' and skip_reason = "Running late"
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 13.2 Write unit tests for degradation
    - Test degradation trigger condition
    - Test optional step dropping
    - Test required step preservation
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ]* 13.3 Write property test for degradation
    - **Property 11: Degradation Preserves Required Steps**
    - **Validates: Requirements 15.3**

- [x] 14. Implement momentum preservation logic
  - [x] 14.1 Add chain status tracking
    - Define chain status (pending, in-progress, completed, failed)
    - Implement `updateChainStatus()` method
    - Add logic: late but complete → SUCCESS, on time but missing steps → FAILURE
    - Prevent replanning mid-flow (no reschedule on overrun)
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 20.1, 20.2, 20.3, 20.4, 20.5_

  - [ ]* 14.2 Write unit tests for momentum preservation
    - Test chain status calculation (late but complete)
    - Test chain status calculation (on time but incomplete)
    - Test no replanning on overrun
    - _Requirements: 16.3, 16.4, 20.1, 20.2_

  - [ ]* 14.3 Write property test for momentum preservation
    - **Property 10: Chain Integrity on Overrun**
    - **Validates: Requirements 16.3, 20.1**

- [x] 15. Checkpoint - Verify degradation and momentum work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Create API endpoint for chains
  - [ ] 16.1 Create GET /api/chains/today endpoint
    - Implement endpoint handler
    - Call Anchor Service to get anchors
    - Call Chain Generator to generate chains
    - Return ChainsResponse (anchors, chains, home_intervals, wake_ramp)
    - Add error handling (calendar service failure, travel service failure)
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]* 16.2 Write API tests for chains endpoint
    - Test successful chain generation
    - Test with no anchors
    - Test with calendar service failure
    - Test with travel service failure
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 17. Add error handling and fallbacks
  - [ ] 17.1 Add calendar service error handling
    - Catch calendar API errors
    - Return empty anchors array
    - Log error for debugging
    - Display message in UI: "No calendar access. Showing basic plan."
    - _Design: Error Handling - Calendar Service Failures_

  - [ ] 17.2 Add travel service error handling
    - Catch travel API errors
    - Use fallback duration: 30 minutes
    - Mark travel block with metadata: fallback_used = true
    - Display warning in UI: "Travel time estimated (service unavailable)"
    - _Design: Error Handling - Travel Service Failures_

  - [ ] 17.3 Add chain generation error handling
    - Catch missing template errors
    - Use default template (class template)
    - Mark chain with metadata: template_fallback = true
    - Log warning with anchor type
    - _Design: Error Handling - Chain Generation Failures_

  - [ ]* 17.4 Write error handling tests
    - Test calendar service failure handling
    - Test travel service failure handling
    - Test missing template handling
    - _Design: Error Handling_

- [ ] 18. Add metadata and debugging support
  - [ ] 18.1 Add chain metadata to TimeBlocks
    - Extend TimeBlock metadata with role field
    - Add chain_id, step_id, anchor_id to metadata
    - Add location_state to metadata
    - Add commitment_envelope to metadata
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 18.2 Add debug logging
    - Log anchor classification
    - Log chain generation steps
    - Log location period calculation
    - Log home interval calculation
    - Log meal placement decisions
    - _Requirements: 17.4, 18.5_

  - [ ]* 18.3 Write property test for metadata linkage
    - **Property 14: Chain Metadata Linkage**
    - **Validates: Requirements 18.2**

- [ ] 19. Checkpoint - Verify error handling and metadata
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. End-to-end testing and validation
  - [ ]* 20.1 Write E2E test: Day with no anchors
    - Generate plan with no calendar events
    - Verify Wake Ramp included
    - Verify basic plan structure
    - _Requirements: 9.1, 11.1_

  - [ ]* 20.2 Write E2E test: Day with one class
    - Generate plan with one class anchor
    - Verify chain generated with all steps
    - Verify commitment envelope structure
    - Verify Exit Gate included
    - _Requirements: 2.1, 4.1, 7.1, 3.1_

  - [ ]* 20.3 Write E2E test: Day with multiple classes
    - Generate plan with multiple anchors
    - Verify multiple chains generated
    - Verify no overlaps
    - Verify location state transitions
    - _Requirements: 12.5, 8.2, 8.3, 8.4_

  - [ ]* 20.4 Write E2E test: Late generation (Wake Ramp skip)
    - Generate plan at 2pm
    - Verify Wake Ramp skipped
    - Verify skip_reason logged
    - _Requirements: 10.1, 10.3, 10.4_

  - [ ]* 20.5 Write E2E test: Out all day (no meals)
    - Generate plan with no home intervals
    - Verify all meals skipped
    - Verify skip_reason = "No home interval"
    - _Requirements: 11.3, 17.5_

  - [ ]* 20.6 Write E2E test: Degradation scenario
    - Simulate running late (current time > Chain Completion Deadline)
    - Verify optional steps dropped
    - Verify required steps preserved
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ]* 20.7 Write E2E test: Chain integrity tracking
    - Simulate chain completion with overruns
    - Verify status = SUCCESS (late but complete)
    - Simulate chain with missing steps
    - Verify status = FAILURE (incomplete)
    - _Requirements: 16.3, 16.4, 20.1, 20.2_

- [ ] 21. Final checkpoint - Verify all E2E tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Documentation and cleanup
  - [ ] 22.1 Update API documentation
    - Document GET /api/chains/today endpoint
    - Document modified POST /api/daily-plan/generate response
    - Add examples for chain responses
    - _Requirements: 19.1, 19.2_

  - [ ] 22.2 Add inline code documentation
    - Add JSDoc comments to all new classes and methods
    - Document chain generation algorithm
    - Document location state calculation
    - Document degradation logic
    - _Design: Components and Interfaces_

  - [ ] 22.3 Create migration guide
    - Document V1.2 → V2 changes
    - Document backward compatibility
    - Document new features (chains, Exit Gate, Chain View)
    - Document configuration options (meal_scaffolding)
    - _Design: Backward Compatibility, Migration Path_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- This is append-only: we're adding to V1.2, not replacing it
- Timeline generation stays (demoted to visualization)
- Chain View becomes primary interface
- No database schema changes required (metadata in JSONB)
