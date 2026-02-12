# Design Document

## Overview

The v5 Integration Plan surgically integrates high-value v5 components into core MessyOS pages, eliminating the isolated /uk-student-dashboard and creating a unified experience. This design preserves v5's well-architected services while embedding UI components where users actually look.

**Integration Strategy:**
- Keep: Services, APIs, database tables, types
- Move: UI components from uk-student/ to core pages
- Archive: Low-value components that violate PRD scope
- Remove: Standalone dashboard page

## Architecture

### Before Integration (Current v5 State)

```mermaid
graph TB
    A[/dashboard] --> B[Core Features Only]
    C[/uk-student-dashboard] --> D[TravelOptimizer]
    C --> E[MealPlanning]
    C --> F[InventoryManager]
    C --> G[SubstanceTracker]
    C --> H[RoutineTracker]
    C --> I[BudgetManager]
    C --> J[LaundryTracker]
    C --> K[ReceiptScanner]
    C --> L[AssignmentBreakdown]
    
    style C fill:#ff6b6b
    style J fill:#ffd93d
    style K fill:#ffd93d
    style L fill:#ffd93d
```

### After Integration (Target State)

```mermaid
graph TB
    A[/dashboard] --> B[Summary Cards]
    B --> C[Exit Times]
    B --> D[Meal Plan]
    B --> E[Routine Status]
    B --> F[Budget Health]
    
    G[/calendar] --> H[TravelOptimizer]
    
    I[/tasks] --> J[MealPlanning]
    I --> K[InventoryManager]
    
    L[/habits] --> M[SubstanceTracker]
    L --> N[RoutineTracker]
    
    O[/finance] --> P[BudgetManager]
    
    style A fill:#6bcf7f
    style G fill:#6bcf7f
    style I fill:#6bcf7f
    style L fill:#6bcf7f
    style O fill:#6bcf7f
```

## Integration Points

### 1. Dashboard Integration

**Location:** `src/pages/dashboard.astro`

**Changes:**
- Add summary cards for exit times, meals, routines, budget
- Replace generic welcome message with actionable daily info
- Link cards to relevant pages (calendar, tasks, habits, finance)

**New Components:**
```typescript
// src/components/dashboard/ExitTimeSummary.tsx
interface ExitTimeSummaryProps {
  userId: string;
  date: Date;
}
// Shows next 2-3 exit times with countdown

// src/components/dashboard/MealPlanSummary.tsx
interface MealPlanSummaryProps {
  userId: string;
  date: Date;
}
// Shows today's meals with cooking status

// src/components/dashboard/RoutineStatusCard.tsx
interface RoutineStatusCardProps {
  userId: string;
  date: Date;
}
// Shows morning/evening routine completion

// src/components/dashboard/BudgetHealthCard.tsx
interface BudgetHealthCardProps {
  userId: string;
}
// Shows weekly spending vs limit
```

### 2. Calendar Integration

**Location:** `src/pages/calendar.astro`

**Changes:**
- Add travel info panel for selected event
- Show exit time countdown for upcoming events
- Display weather-aware travel recommendations

**Integration:**
```typescript
// Reuse existing v5 component with new location
import { TravelOptimizer } from '../components/travel/TravelOptimizer';
// Previously: '../components/uk-student/TravelOptimizer'

// Add to calendar event detail view
<TravelOptimizer
  event={selectedEvent}
  currentLocation={userLocation}
  weather={weatherData}
  onRouteSelect={handleRouteSelection}
/>
```

### 3. Tasks Integration

**Location:** `src/pages/tasks.astro`

**Changes:**
- Add "Today's Meals" section above task list
- Add "Pantry" sidebar widget showing inventory
- Link meal tasks to meal planning service

**Integration:**
```typescript
// Reuse existing v5 components
import { MealPlanningDashboard } from '../components/meals/MealPlanningDashboard';
import { InventoryManager } from '../components/meals/InventoryManager';

// Add to tasks page layout
<div class="grid grid-cols-3 gap-6">
  <div class="col-span-2">
    <MealPlanningDashboard userId={user.id} date={today} />
    <TaskList userId={user.id} />
  </div>
  <div class="col-span-1">
    <InventoryManager userId={user.id} compact={true} />
  </div>
</div>
```

### 4. Habits Integration

**Location:** `src/pages/habits.astro`

**Changes:**
- Add "Routines" section showing morning/evening routines
- Add "Substance Tracking" section with non-judgmental logging
- Integrate with existing habit tracking UI

**Integration:**
```typescript
// Reuse existing v5 components
import { RoutineTracker } from '../components/habits/RoutineTracker';
import { SubstanceTracker } from '../components/habits/SubstanceTracker';

// Add to habits page
<div class="space-y-6">
  <RoutineTracker userId={user.id} />
  <SubstanceTracker userId={user.id} />
  <HabitTracker userId={user.id} />
</div>
```

### 5. Finance Integration

**Location:** `src/pages/finance.astro`

**Changes:**
- Add budget health summary at top
- Show spending by category and store
- Display budget alerts

**Integration:**
```typescript
// Reuse existing v5 component
import { BudgetManager } from '../components/finance/BudgetManager';

// Add to finance page
<BudgetManager 
  userId={user.id}
  accounts={ukAccounts}
  expenses={expenses}
  budgetLimits={budgetLimits}
/>
```

## Component Migration Plan

### High-Value Components (Keep & Integrate)

| Component | From | To | Integration Point |
|-----------|------|----|--------------------|
| TravelOptimizer | uk-student/ | travel/ | /calendar |
| MealPlanningDashboard | uk-student/ | meals/ | /tasks |
| InventoryManager | uk-student/ | meals/ | /tasks |
| SubstanceTracker | uk-student/ | habits/ | /habits |
| RoutineTracker | uk-student/ | habits/ | /habits |
| BudgetManager | uk-student/ | finance/ | /finance |

### Low-Value Components (Archive)

| Component | Reason | Archive Location |
|-----------|--------|------------------|
| AssignmentBreakdown | Complex academic AI (deferred in PRD) | .archive/uk-student/academic/ |
| LaundryTracker | Nice-to-have, not core | .archive/uk-student/laundry/ |
| ReceiptScanner | OCR complexity, not core | .archive/uk-student/finance/ |
| ShoppingListOptimizer | Over-optimization | .archive/uk-student/meals/ |
| AcademicDashboard | Separate from daily planning | .archive/uk-student/academic/ |
| UKStudentDashboard | Standalone dashboard (replaced) | .archive/uk-student/ |

## Service Layer (No Changes)

**Keep all v5 services as-is:**
- `src/lib/uk-student/travel-service.ts`
- `src/lib/uk-student/meal-planning-service.ts`
- `src/lib/uk-student/inventory-service.ts`
- `src/lib/uk-student/routine-service.ts`
- `src/lib/uk-student/uk-finance-service.ts`
- `src/lib/uk-student/location-service.ts`
- `src/lib/uk-student/route-cache.ts`
- `src/lib/uk-student/validation.ts`

**Rationale:** Services are well-architected and work correctly. Only UI integration is needed.

## Database Schema (No Changes)

**Keep all v5 tables:**
- `uk_student_inventory`
- `uk_student_meal_plans`
- `uk_student_travel_routes`
- `uk_student_expenses`
- `uk_student_routines`
- `uk_student_locations`

**Note:** `uk_student_academic_events` can be archived since AcademicDashboard is being removed.

## API Endpoints (No Changes)

**Keep all v5 API routes:**
- `/api/uk-student/travel/*`
- `/api/uk-student/meals/*`
- `/api/uk-student/inventory/*`
- `/api/uk-student/routines/*`
- `/api/uk-student/finance/*`

**Rationale:** APIs work correctly. UI components will continue using them.

## Navigation Updates

### Before:
```typescript
// src/layouts/DashboardLayout.astro
<nav>
  <a href="/dashboard">Dashboard</a>
  <a href="/tasks">Tasks</a>
  <a href="/habits">Habits</a>
  <a href="/calendar">Calendar</a>
  <a href="/finance">Finance</a>
  <a href="/uk-student-dashboard">UK Student</a> <!-- Remove this -->
</nav>
```

### After:
```typescript
// src/layouts/DashboardLayout.astro
<nav>
  <a href="/dashboard">Dashboard</a>
  <a href="/daily-plan">Daily Plan</a> <!-- New from daily-plan-generator spec -->
  <a href="/tasks">Tasks</a>
  <a href="/habits">Habits</a>
  <a href="/calendar">Calendar</a>
  <a href="/finance">Finance</a>
</nav>
```

## File Structure Changes

### Before:
```
src/
├── components/
│   ├── uk-student/
│   │   ├── TravelOptimizer.tsx
│   │   ├── MealPlanningDashboard.tsx
│   │   ├── InventoryManager.tsx
│   │   ├── SubstanceTracker.tsx
│   │   ├── RoutineTracker.tsx
│   │   ├── BudgetManager.tsx
│   │   ├── LaundryTracker.tsx (archive)
│   │   ├── ReceiptScanner.tsx (archive)
│   │   ├── AssignmentBreakdown.tsx (archive)
│   │   └── UKStudentDashboard.tsx (archive)
├── pages/
│   ├── uk-student-dashboard.astro (archive)
```

### After:
```
src/
├── components/
│   ├── travel/
│   │   └── TravelOptimizer.tsx (moved)
│   ├── meals/
│   │   ├── MealPlanningDashboard.tsx (moved)
│   │   └── InventoryManager.tsx (moved)
│   ├── habits/
│   │   ├── SubstanceTracker.tsx (moved)
│   │   └── RoutineTracker.tsx (moved)
│   ├── finance/
│   │   └── BudgetManager.tsx (moved)
│   ├── dashboard/
│   │   ├── ExitTimeSummary.tsx (new)
│   │   ├── MealPlanSummary.tsx (new)
│   │   ├── RoutineStatusCard.tsx (new)
│   │   └── BudgetHealthCard.tsx (new)
.archive/
├── uk-student/
│   ├── components/
│   │   ├── LaundryTracker.tsx
│   │   ├── ReceiptScanner.tsx
│   │   ├── AssignmentBreakdown.tsx
│   │   ├── AcademicDashboard.tsx
│   │   └── UKStudentDashboard.tsx
│   ├── pages/
│   │   └── uk-student-dashboard.astro
│   └── README.md (explains why archived)
```

## Testing Strategy

### Integration Tests

1. **Dashboard Integration Test**
   - Verify exit time summary shows correct data
   - Verify meal plan summary shows today's meals
   - Verify routine status shows completion
   - Verify budget health shows spending vs limit

2. **Calendar Integration Test**
   - Verify travel optimizer appears for events with locations
   - Verify exit time calculation uses travel service
   - Verify weather updates trigger travel recommendation changes

3. **Tasks Integration Test**
   - Verify meal planning dashboard shows on tasks page
   - Verify inventory manager shows in sidebar
   - Verify meal tasks link to meal planning service

4. **Habits Integration Test**
   - Verify routine tracker shows morning/evening routines
   - Verify substance tracker shows logging interface
   - Verify both integrate with existing habit tracking

5. **Finance Integration Test**
   - Verify budget manager shows on finance page
   - Verify spending categorization works
   - Verify budget alerts display correctly

### Regression Tests

1. **Verify v5 Services Still Work**
   - Run all existing v5 service tests
   - Verify API endpoints still respond correctly
   - Verify database queries still work

2. **Verify Core Pages Still Work**
   - Test dashboard loads without errors
   - Test tasks page loads without errors
   - Test habits page loads without errors
   - Test calendar page loads without errors
   - Test finance page loads without errors

### End-to-End Tests

1. **Complete User Journey**
   - User logs in → sees dashboard with v5 summaries
   - User clicks calendar → sees travel optimizer
   - User clicks tasks → sees meal planning
   - User clicks habits → sees routines and substance tracking
   - User clicks finance → sees budget manager

## Migration Steps

### Phase 1: Preparation (No User Impact)
1. Create `.archive/uk-student/` directory
2. Create new component directories (`travel/`, `meals/`, `habits/`, `finance/`)
3. Document current v5 functionality

### Phase 2: Component Migration (No User Impact)
1. Copy high-value components to new locations
2. Update import paths in copied components
3. Run tests to verify components still work
4. Do NOT delete original components yet

### Phase 3: Integration (User-Facing Changes)
1. Update dashboard.astro with summary cards
2. Update calendar.astro with travel optimizer
3. Update tasks.astro with meal planning and inventory
4. Update habits.astro with routines and substance tracking
5. Update finance.astro with budget manager
6. Test each page after integration

### Phase 4: Cleanup (Remove Duplicates)
1. Archive low-value components
2. Archive standalone dashboard
3. Remove uk-student-dashboard link from navigation
4. Add redirect from /uk-student-dashboard to /dashboard
5. Update all internal links

### Phase 5: Verification
1. Run full test suite
2. Manual testing of all integrated features
3. Verify no data loss
4. Verify no broken links
5. Document integration completion

## Error Handling

### Missing v5 Data
```typescript
// Handle case where user has no v5 data yet
function renderMealPlanSummary(userId: string) {
  const mealPlan = await mealService.getMealPlan(userId, today);
  
  if (!mealPlan) {
    return <EmptyState message="No meal plan yet. Create one in Tasks." />;
  }
  
  return <MealPlanSummary plan={mealPlan} />;
}
```

### Component Load Failures
```typescript
// Graceful degradation if v5 component fails
<ErrorBoundary fallback={<ComponentUnavailable name="Travel Optimizer" />}>
  <TravelOptimizer {...props} />
</ErrorBoundary>
```

### Service Unavailability
```typescript
// Handle v5 service failures
try {
  const route = await travelService.getRoute(from, to);
  return route;
} catch (error) {
  logger.error('Travel service unavailable', error);
  return fallbackRoute(from, to);
}
```

## Rollback Plan

If integration causes issues:

1. **Immediate Rollback:**
   - Restore uk-student-dashboard link in navigation
   - Remove integrated components from core pages
   - Revert to standalone dashboard

2. **Partial Rollback:**
   - Keep working integrations
   - Rollback problematic integrations
   - Fix issues and re-integrate

3. **Data Safety:**
   - No database changes means no data loss risk
   - All v5 tables remain intact
   - Services continue working regardless of UI changes

This design provides a clear, surgical integration path that preserves v5's good work while making it actually usable in daily life.
