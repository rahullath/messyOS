# Implementation Plan: v5 Integration

## Overview

This plan surgically integrates high-value v5 components into core MessyOS pages, eliminating the isolated /uk-student-dashboard and creating a unified experience. The approach is incremental and safe: prepare → migrate → integrate → cleanup → verify.

## Tasks

- [ ] 1. Preparation - Create archive structure and document current state
  - Create `.archive/uk-student/` directory structure
  - Create new component directories (`src/components/travel/`, `meals/`, `habits/`, `finance/`, `dashboard/`)
  - Document current v5 functionality and component locations
  - Take database backup before any changes
  - _Requirements: 11.1, 14.1, 14.2_

- [ ] 2. Copy high-value components to new locations (no deletions yet)
  - [ ] 2.1 Copy TravelOptimizer to src/components/travel/
    - Update import paths within component
    - Verify component still works in isolation
    - _Requirements: 2.1, 10.1, 10.5_

  - [ ] 2.2 Copy MealPlanningDashboard and InventoryManager to src/components/meals/
    - Update import paths within components
    - Verify components still work in isolation
    - _Requirements: 3.1, 4.1, 10.1, 10.5_

  - [ ] 2.3 Copy SubstanceTracker and RoutineTracker to src/components/habits/
    - Update import paths within components
    - Verify components still work in isolation
    - _Requirements: 5.1, 6.1, 10.1, 10.5_

  - [ ] 2.4 Copy BudgetManager to src/components/finance/
    - Update import paths within component
    - Verify component still works in isolation
    - _Requirements: 7.1, 10.1, 10.5_

  - [ ]* 2.5 Run v5 component tests with new locations
    - Update test import paths
    - Verify all tests pass
    - _Requirements: 13.1, 13.2_

- [ ] 3. Create dashboard summary components
  - [ ] 3.1 Create ExitTimeSummary component
    - Fetch next 2-3 exit times from travel service
    - Display countdown with color-coded urgency
    - Link to calendar page
    - _Requirements: 9.1_

  - [ ] 3.2 Create MealPlanSummary component
    - Fetch today's meal plan from meal service
    - Show breakfast/lunch/dinner with cooking status
    - Link to tasks page
    - _Requirements: 9.2_

  - [ ] 3.3 Create RoutineStatusCard component
    - Fetch morning/evening routine status
    - Show completion progress
    - Link to habits page
    - _Requirements: 9.3_

  - [ ] 3.4 Create BudgetHealthCard component
    - Fetch weekly spending vs limit
    - Show budget health status (good/warning/critical)
    - Link to finance page
    - _Requirements: 9.4_

  - [ ]* 3.5 Write unit tests for dashboard summary components
    - Test data fetching and display
    - Test empty states
    - Test error handling
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 4. Checkpoint - Verify all components work in new locations
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Integrate components into dashboard
  - [ ] 5.1 Update src/pages/dashboard.astro
    - Add ExitTimeSummary, MealPlanSummary, RoutineStatusCard, BudgetHealthCard
    - Replace generic welcome message with actionable daily info
    - Ensure responsive layout (grid on desktop, stack on mobile)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 5.2 Test dashboard integration
    - Verify all summary cards load correctly
    - Verify links to detail pages work
    - Verify empty states display when no data
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 6. Integrate TravelOptimizer into calendar
  - [ ] 6.1 Update src/pages/calendar.astro
    - Add TravelOptimizer component to event detail view
    - Show exit time countdown for upcoming events
    - Display weather-aware travel recommendations
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 6.2 Test calendar integration
    - Verify travel info appears for events with locations
    - Verify exit time calculation works
    - Verify weather updates trigger recommendation changes
    - _Requirements: 2.1, 2.2, 2.4_

- [ ] 7. Integrate meal planning and inventory into tasks
  - [ ] 7.1 Update src/pages/tasks.astro
    - Add MealPlanningDashboard above task list
    - Add InventoryManager in sidebar
    - Ensure responsive layout (sidebar collapses on mobile)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 7.2 Test tasks integration
    - Verify meal plan displays correctly
    - Verify inventory shows in sidebar
    - Verify "Add to shopping list" button works
    - Verify meal completion updates inventory
    - _Requirements: 3.1, 3.2, 3.4, 4.1_

- [ ] 8. Integrate routines and substance tracking into habits
  - [ ] 8.1 Update src/pages/habits.astro
    - Add RoutineTracker section
    - Add SubstanceTracker section
    - Integrate with existing habit tracking UI
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 8.2 Test habits integration
    - Verify routines display with all steps
    - Verify substance tracking logs correctly
    - Verify consistency tracking works
    - Verify no streak worship or punishment
    - _Requirements: 5.1, 5.3, 5.4, 6.1, 6.3_

- [ ] 9. Integrate budget manager into finance
  - [ ] 9.1 Update src/pages/finance.astro
    - Add BudgetManager component at top of page
    - Show spending by category and store
    - Display budget alerts
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 9.2 Test finance integration
    - Verify budget health displays correctly
    - Verify spending categorization works
    - Verify budget alerts show when approaching limits
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 10. Checkpoint - Verify all integrations work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Update navigation
  - [ ] 11.1 Update src/layouts/DashboardLayout.astro
    - Remove "UK Student Dashboard" link
    - Add "Daily Plan" link (from daily-plan-generator spec)
    - Ensure active page indicator works
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 11.2 Add redirect from /uk-student-dashboard to /dashboard
    - Create redirect in uk-student-dashboard.astro
    - Test redirect works
    - _Requirements: 1.2_

  - [ ] 11.3 Test navigation
    - Verify all links work
    - Verify active page indicator shows correctly
    - Verify redirect works
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 12. Archive low-value components
  - [ ] 12.1 Move low-value components to .archive/uk-student/
    - Move AssignmentBreakdown to .archive/uk-student/academic/
    - Move LaundryTracker to .archive/uk-student/laundry/
    - Move ReceiptScanner to .archive/uk-student/finance/
    - Move ShoppingListOptimizer to .archive/uk-student/meals/
    - Move AcademicDashboard to .archive/uk-student/academic/
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 14.1, 14.2_

  - [ ] 12.2 Create .archive/uk-student/README.md
    - Document why components were archived
    - Include archive date
    - Explain how to access archived code if needed
    - _Requirements: 14.2, 14.4_

  - [ ] 12.3 Remove imports of archived components
    - Search codebase for imports of archived components
    - Remove or update imports
    - _Requirements: 14.3_

- [ ] 13. Archive standalone dashboard
  - [ ] 13.1 Move UKStudentDashboard component to .archive/uk-student/
    - Move component file
    - Update archive README
    - _Requirements: 1.3, 14.1_

  - [ ] 13.2 Move uk-student-dashboard.astro to .archive/uk-student/pages/
    - Keep redirect in place (from step 11.2)
    - Update archive README
    - _Requirements: 1.4, 14.1_

  - [ ] 13.3 Remove original uk-student components from src/components/uk-student/
    - Only remove components that were successfully migrated
    - Keep service files in src/lib/uk-student/
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 14. Update v5 tests for new component locations
  - [ ] 14.1 Update test import paths
    - Update imports in all v5 tests
    - Point to new component locations
    - _Requirements: 13.1, 13.2_

  - [ ] 14.2 Add integration tests for new component locations
    - Test TravelOptimizer in calendar context
    - Test MealPlanning in tasks context
    - Test Routines/Substance in habits context
    - Test BudgetManager in finance context
    - _Requirements: 13.3_

  - [ ] 14.3 Run full test suite
    - Run all unit tests
    - Run all integration tests
    - Fix any failures
    - _Requirements: 13.2, 13.4_

- [ ] 15. Create integration verification checklist
  - [ ] 15.1 Create INTEGRATION_VERIFICATION.md
    - List all integrated features
    - Provide manual testing steps
    - Include screenshots/examples
    - _Requirements: 15.1_

  - [ ] 15.2 Perform manual verification
    - Verify travel optimizer accessible from calendar
    - Verify meal planning accessible from tasks
    - Verify inventory accessible from tasks
    - Verify substance/routine tracking accessible from habits
    - Verify budget manager accessible from finance
    - _Requirements: 15.2, 15.3, 15.4, 15.5_

  - [ ] 15.3 Verify no data loss
    - Check all v5 database tables still have data
    - Verify services still query correctly
    - Verify no broken foreign keys
    - _Requirements: 11.5_

- [ ] 16. Update documentation
  - [ ] 16.1 Update README.md
    - Remove references to standalone UK Student dashboard
    - Document integrated features
    - Update navigation instructions
    - _Requirements: 14.4_

  - [ ] 16.2 Create migration guide
    - Document what changed
    - Explain where features moved
    - Provide before/after screenshots
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ] 16.3 Update V5_AUDIT_FINDINGS.md
    - Mark integration as complete
    - Document outcomes
    - Note any deviations from plan
    - _Requirements: 15.1_

- [ ] 17. Final checkpoint - End-to-end verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No database changes means no data loss risk
- Services remain in src/lib/uk-student/ (no migration needed)
- Integration is UI-only, preserving all working backend code
- Rollback is simple: restore navigation link and revert page changes
