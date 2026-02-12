# Requirements Document

## Introduction

The v5 Integration Plan addresses the critical finding from the v5 audit: v5 built high-quality components that are completely isolated from the core MessyOS experience. This spec defines how to integrate the 5 high-value v5 components (TravelOptimizer, InventoryManager, MealPlanning, SubstanceTracker, RoutineTracker) into the core MessyOS pages and workflows, while removing or archiving low-value components that violate the PRD scope.

This is NOT a rewrite. This is surgical integration that makes v5's good work actually usable in daily life.

## Glossary

- **Core_Pages**: The main MessyOS pages (/dashboard, /tasks, /habits, /calendar, /finance)
- **v5_Components**: React components built in the uk-student module
- **Integration_Point**: A location in core pages where v5 functionality is embedded
- **High_Value_Component**: v5 component that aligns with PRD and provides friction reduction
- **Low_Value_Component**: v5 component that violates PRD scope (over-optimization, feature creep)
- **Standalone_Dashboard**: The isolated /uk-student-dashboard page that users never visit
- **Unified_Experience**: Single dashboard where all features are accessible without mode switching

## Requirements

### Requirement 1: Remove Standalone UK Student Dashboard

**User Story:** As a user who never visits /uk-student-dashboard, I want all useful features integrated into the core pages I actually use, so that I benefit from v5's work without having to remember a separate URL.

#### Acceptance Criteria

1. WHEN I visit /dashboard THEN the System SHALL NOT show a link to /uk-student-dashboard
2. WHEN I visit /uk-student-dashboard THEN the System SHALL redirect to /dashboard
3. WHEN v5 components are integrated THEN the System SHALL remove the standalone UKStudentDashboard component
4. WHEN integration is complete THEN the System SHALL archive uk-student-dashboard.astro
5. WHEN integration is complete THEN the System SHALL update all internal links to point to core pages

### Requirement 2: Integrate Travel Optimizer into Calendar

**User Story:** As a user who frequently misses trains due to poor exit time estimation, I want travel recommendations and exit times shown directly on my calendar, so that I see them when planning my day.

#### Acceptance Criteria

1. WHEN I view /calendar THEN the System SHALL show exit times for all events with locations
2. WHEN I view an event THEN the System SHALL show recommended travel method based on weather
3. WHEN I view an event THEN the System SHALL show travel duration, cost, and weather suitability
4. WHEN weather changes THEN the System SHALL update travel recommendations and notify me
5. WHEN I click on travel info THEN the System SHALL show alternative routes and methods

### Requirement 3: Integrate Meal Planning into Tasks

**User Story:** As a user who skips meals due to poor planning, I want meal preparation shown as tasks with cooking time, so that I schedule time to eat and don't lie to myself about "quick meals."

#### Acceptance Criteria

1. WHEN I view /tasks THEN the System SHALL show today's meal plan (breakfast, lunch, dinner)
2. WHEN I view a meal task THEN the System SHALL show cooking time, cleanup time, and required ingredients
3. WHEN I'm missing ingredients THEN the System SHALL show "Add to shopping list" button
4. WHEN I complete a meal task THEN the System SHALL mark it complete and update inventory
5. WHEN I skip a meal THEN the System SHALL record it and suggest quick alternatives

### Requirement 4: Integrate Inventory Manager into Tasks

**User Story:** As a user who wastes food and money, I want to see what ingredients I have when planning meals, so that I use what I own before buying more.

#### Acceptance Criteria

1. WHEN I view /tasks THEN the System SHALL show a "Pantry" widget with current inventory
2. WHEN I view inventory THEN the System SHALL highlight items expiring soon
3. WHEN I plan meals THEN the System SHALL suggest recipes using available ingredients
4. WHEN I add groceries THEN the System SHALL update inventory automatically
5. WHEN items expire THEN the System SHALL remove them and track waste

### Requirement 5: Integrate Substance Tracker into Habits

**User Story:** As a user recovering from substance abuse, I want substance logging integrated with my habit tracking, so that I have one place to record all daily accountability data.

#### Acceptance Criteria

1. WHEN I view /habits THEN the System SHALL show substance tracking alongside other habits
2. WHEN I log substance use THEN the System SHALL record it with timestamp and context
3. WHEN I view substance history THEN the System SHALL show patterns without judgment
4. WHEN I reduce usage THEN the System SHALL celebrate progress without streak worship
5. WHEN I increase usage THEN the System SHALL offer support without punishment

### Requirement 6: Integrate Routine Tracker into Habits

**User Story:** As a user with complex morning and evening routines, I want routine tracking integrated with habits, so that I see all my daily structure in one place.

#### Acceptance Criteria

1. WHEN I view /habits THEN the System SHALL show active routines (morning, evening)
2. WHEN I start a routine THEN the System SHALL show all steps with estimated duration
3. WHEN I complete routine steps THEN the System SHALL track actual time vs estimated
4. WHEN I consistently run late THEN the System SHALL suggest routine adjustments
5. WHEN I complete routines THEN the System SHALL track consistency without streak worship

### Requirement 7: Integrate Budget Manager into Finance

**User Story:** As a user with multiple UK bank accounts, I want budget tracking integrated into the core finance page, so that I see spending alerts where I already track expenses.

#### Acceptance Criteria

1. WHEN I view /finance THEN the System SHALL show budget health (weekly/monthly spending vs limits)
2. WHEN I approach budget limits THEN the System SHALL show alerts on the finance page
3. WHEN I add expenses THEN the System SHALL categorize them and update budget status
4. WHEN I overspend THEN the System SHALL suggest alternatives without judgment
5. WHEN I view spending THEN the System SHALL show breakdown by category and store

### Requirement 8: Remove Low-Value Components

**User Story:** As a user who wants a focused, minimal system, I want feature-creep components removed, so that MessyOS stays aligned with the PRD's friction-reduction philosophy.

#### Acceptance Criteria

1. WHEN integration is complete THEN the System SHALL archive AssignmentBreakdown component
2. WHEN integration is complete THEN the System SHALL archive LaundryTracker component
3. WHEN integration is complete THEN the System SHALL archive ReceiptScanner component
4. WHEN integration is complete THEN the System SHALL archive ShoppingListOptimizer component
5. WHEN integration is complete THEN the System SHALL archive AcademicDashboard component

### Requirement 9: Update Main Dashboard

**User Story:** As a user who lands on /dashboard first, I want to see the most important information from v5 components, so that I know what needs my attention without clicking through multiple pages.

#### Acceptance Criteria

1. WHEN I view /dashboard THEN the System SHALL show today's exit times for upcoming events
2. WHEN I view /dashboard THEN the System SHALL show today's meal plan summary
3. WHEN I view /dashboard THEN the System SHALL show current routine status (morning/evening)
4. WHEN I view /dashboard THEN the System SHALL show budget health status
5. WHEN I view /dashboard THEN the System SHALL show inventory items expiring soon

### Requirement 10: Maintain v5 Services

**User Story:** As a developer integrating v5 components, I want to keep the well-architected v5 services, so that I don't have to rewrite working code.

#### Acceptance Criteria

1. WHEN integrating components THEN the System SHALL use existing v5 service files
2. WHEN integrating components THEN the System SHALL maintain v5 database tables
3. WHEN integrating components THEN the System SHALL keep v5 TypeScript interfaces
4. WHEN integrating components THEN the System SHALL preserve v5 API endpoints
5. WHEN integrating components THEN the System SHALL update import paths to reflect new component locations

### Requirement 11: Create Migration Guide

**User Story:** As a user with existing data in v5 tables, I want a migration guide that explains what happens to my data, so that I don't lose information during integration.

#### Acceptance Criteria

1. WHEN integration begins THEN the System SHALL document which v5 tables are kept
2. WHEN integration begins THEN the System SHALL document which v5 tables are archived
3. WHEN integration begins THEN the System SHALL provide SQL migration scripts if needed
4. WHEN integration begins THEN the System SHALL explain how to access archived data
5. WHEN integration is complete THEN the System SHALL verify no data loss occurred

### Requirement 12: Update Navigation

**User Story:** As a user navigating MessyOS, I want clear navigation that reflects the integrated experience, so that I don't get confused by duplicate or missing features.

#### Acceptance Criteria

1. WHEN I view navigation THEN the System SHALL remove "UK Student Dashboard" link
2. WHEN I view navigation THEN the System SHALL keep core page links (Dashboard, Tasks, Habits, Calendar, Finance)
3. WHEN I view navigation THEN the System SHALL add "Daily Plan" link (from daily-plan-generator spec)
4. WHEN I view navigation THEN the System SHALL show active page indicator
5. WHEN I view navigation THEN the System SHALL be consistent across all pages

### Requirement 13: Preserve v5 Tests

**User Story:** As a developer maintaining MessyOS, I want v5 tests preserved and updated, so that I can verify integrated components still work correctly.

#### Acceptance Criteria

1. WHEN integrating components THEN the System SHALL update v5 test import paths
2. WHEN integrating components THEN the System SHALL run all v5 tests to verify functionality
3. WHEN integrating components THEN the System SHALL add integration tests for new component locations
4. WHEN tests fail THEN the System SHALL fix issues before marking integration complete
5. WHEN integration is complete THEN the System SHALL document test coverage for integrated features

### Requirement 14: Archive Unused v5 Code

**User Story:** As a developer maintaining a clean codebase, I want unused v5 code archived (not deleted), so that I can reference it later if needed without cluttering the active codebase.

#### Acceptance Criteria

1. WHEN low-value components are removed THEN the System SHALL move them to .archive/ directory
2. WHEN components are archived THEN the System SHALL include archive date and reason in README
3. WHEN components are archived THEN the System SHALL remove imports from active code
4. WHEN components are archived THEN the System SHALL update documentation to reflect removal
5. WHEN components are archived THEN the System SHALL keep git history intact

### Requirement 15: Integration Verification

**User Story:** As a user who wants to verify the integration worked, I want a checklist that confirms all v5 features are accessible from core pages, so that I know nothing was lost.

#### Acceptance Criteria

1. WHEN integration is complete THEN the System SHALL provide a verification checklist
2. WHEN verifying THEN the System SHALL confirm travel optimizer accessible from calendar
3. WHEN verifying THEN the System SHALL confirm meal planning accessible from tasks
4. WHEN verifying THEN the System SHALL confirm inventory accessible from tasks
5. WHEN verifying THEN the System SHALL confirm substance/routine tracking accessible from habits
