# Habits Module - Current Architecture & Capabilities

## Overview
The habits module is a comprehensive habit tracking system with advanced features including AI insights, performance optimization, streak tracking, and context-aware logging.

---

## Core Data Model

### Database Tables

#### `habits` Table
Primary habit definition table with the following key fields:
- **Identity**: `id`, `user_id`, `name`, `description`
- **Configuration**: 
  - `type`: 'build' | 'break' | 'maintain'
  - `measurement_type`: 'boolean' | 'count' | 'duration'
  - `target_value`, `target_unit` (for count/duration types)
  - `color`: Visual identifier
  - `category`: User-defined categorization
- **Tracking**:
  - `streak_count`: Current active streak
  - `best_streak`: All-time best streak
  - `position`: Display order
  - `allows_skips`: Whether skipped days maintain streak
- **Status**: `is_active`, `created_at`, `updated_at`
- **Reminders**: `reminder_time`

#### `habit_entries` Table
Individual habit completion logs with rich context:
- **Core**: `id`, `habit_id`, `user_id`, `date`, `value`
  - `value`: 0=missed, 1=completed, 2=skipped, 3=partial
- **Context Data**:
  - `notes`: TEXT field for free-form notes (currently underutilized)
  - `effort`: 1-5 scale
  - `mood`: 1-5 scale
  - `energy_level`: 1-5 scale
  - `location`: TEXT (e.g., "Home", "Gym", "Office")
  - `weather`: TEXT
  - `context_tags`: TEXT[] array
- **Timing**:
  - `duration_minutes`: For duration-based habits
  - `completion_time`: Time of day completed
  - `logged_at`: When entry was created

#### Supporting Tables
- `habit_insights`: Stores AI-generated insights
- `habit_daily_summary`: Aggregated daily statistics
- `habit_correlations`: Cross-habit pattern analysis

---

## Core Features

### 1. Habit Creation & Management
**Location**: `src/pages/api/habits/create.ts`, `src/components/habits/HabitCreationModal.tsx`

**Capabilities**:
- Create habits with multiple measurement types (boolean, count, duration)
- Set targets and units for quantifiable habits
- Configure habit type (build/break/maintain)
- Color coding and categorization
- Position-based ordering
- Duplicate name detection
- Reminder time configuration

**Validation**:
- Required fields: name, category
- Target value required for count/duration types
- Target unit required for count/duration types

### 2. Enhanced Habit Logging
**Location**: `src/pages/api/habits/[id]/log-enhanced.ts`

**Capabilities**:
- Log habit completions with rich context
- Support for 4 completion states: missed, completed, skipped, partial
- **Custom date logging** (can log for past/future dates)
- Context tracking:
  - Effort level (1-5)
  - Mood (1-5)
  - Energy level (1-5)
  - Location
  - Weather conditions
  - Custom tags array
  - Free-form notes
  - Duration in minutes
  - Completion time
- Automatic streak recalculation on log
- Update existing entries instead of creating duplicates

### 3. Streak Calculation System
**Location**: `src/lib/habits/streaks.ts`, `src/lib/habits/optimized-streak-service.ts`

**Capabilities**:
- **Multiple streak types**:
  - Build habits: Success = completed/partial
  - Break habits: Success = NOT doing the habit (value=0)
  - Maintain habits: Success = completed/partial
- **Skip support**: Skipped days (value=2) don't break streaks
- **Optimized calculation**:
  - Database-side calculation via `calculate_habit_streak` function
  - Client-side fallback for reliability
  - Caching for performance (1 hour TTL)
  - Batch calculation for multiple habits
- **Streak analytics**:
  - Current streak
  - Best streak (all-time)
  - Streak history with date ranges
  - Trend analysis (daily, weekly, monthly)
- **Automatic updates**: Triggers on entry insert/update

### 4. AI-Powered Insights
**Location**: `src/lib/habits/ai-insights.ts`, `src/pages/api/habits/ai/`

**Capabilities**:
- **Pattern Analysis** (25 tokens):
  - Completion rate analysis
  - Streak pattern detection
  - Performance trends
  - Actionable recommendations
- **Natural Language Parsing** (15 tokens):
  - Parse habit logs from text input
  - Fuzzy matching against user's habits
  - Extract duration/count values
  - Suggest context from text
  - Support for relative dates ("yesterday", "today")
- **Personalized Recommendations** (30 tokens):
  - Optimal timing suggestions
  - Goal adjustment recommendations
  - Approach improvements
  - Context-based insights
- **Optimal Conditions Analysis** (20 tokens):
  - Best mood for success
  - Optimal energy levels
  - Favorable locations
  - Best weather conditions
  - Successful context tags
  - Best time of day
  - Best days of week
- **Habit Correlation** (35 tokens):
  - Cross-habit pattern detection

**Token System Integration**:
- All AI features require token balance
- Automatic token deduction
- Transaction logging
- Insufficient balance handling

### 5. Performance Optimization
**Location**: `src/lib/habits/cache-service.ts`, `src/lib/habits/pagination-service.ts`

**Caching System**:
- **User habits cache**: 5 minutes TTL
- **Habit entries cache**: 5 minutes TTL
- **Analytics cache**: 15 minutes TTL
- **Daily summary cache**: 1 hour TTL
- **Streak cache**: 1 hour TTL
- Automatic cleanup every 10 minutes
- Cache invalidation on updates
- Preloading for frequently accessed data

**Database Optimization**:
- Composite indexes for common queries
- Optimized streak calculation indexes
- Context data GIN indexes
- Location and time-based indexes
- Materialized views for analytics

**Performance Monitoring**:
- Cache hit rate tracking
- Query performance metrics
- Processing time logging

### 6. Analytics & Reporting
**Location**: `src/pages/api/habits/analytics/`, `src/components/habits/HabitsAnalyticsDashboard.tsx`

**Capabilities**:
- **Habit-level analytics**:
  - Completion rates
  - Streak statistics
  - Average effort/mood/energy
  - Best locations for success
  - Optimal weather conditions
  - Successful context tags
- **Daily summaries**:
  - Total habits logged
  - Completion rate
  - Average metrics
  - Location patterns
  - Tag aggregation
- **Export functionality**:
  - CSV export of all data
  - Date range filtering
  - Habit-specific exports

### 7. Data Import
**Location**: `src/components/import/EnhancedLoopHabitsImport.tsx`

**Capabilities**:
- Import from Loop Habits app
- Three-file import (Habits.csv, Checkmarks.csv, Scores.csv)
- Conflict resolution:
  - Merge with existing habits
  - Replace existing habits
  - Skip conflicting habits
  - Rename imported habits
- Streaming progress updates
- Automatic streak calculation post-import
- Validation and error handling
- Import summary with recommendations

### 8. Mobile Optimization
**Location**: `src/components/habits/MobileQuickActions.tsx`

**Capabilities**:
- Quick action buttons for mobile
- Touch-optimized UI
- Swipe gestures
- Offline support via service worker
- PWA integration

### 9. Notifications & Reminders
**Location**: `src/lib/habits/notifications.ts`

**Capabilities**:
- Reminder time configuration
- Push notification support (PWA)
- Streak milestone notifications

### 10. Offline Sync
**Location**: `src/lib/habits/offline-sync.ts`

**Capabilities**:
- Queue habit logs when offline
- Automatic sync when connection restored
- Conflict resolution
- Background sync API integration

---

## API Endpoints

### Core Endpoints
- `GET /api/habits` - List user's habits
- `POST /api/habits` - Create new habit
- `POST /api/habits/create` - Enhanced creation with validation
- `POST /api/habits/[id]/log` - Basic logging
- `POST /api/habits/[id]/log-enhanced` - Enhanced logging with context
- `POST /api/habits/batch-complete` - Batch completion
- `POST /api/habits/recalculate-streaks` - Recalculate all streaks
- `POST /api/habits/cleanup-duplicates` - Remove duplicate entries

### AI Endpoints
- `POST /api/habits/ai/insights` - Generate AI insights
- `POST /api/habits/ai/natural-language` - Parse natural language logs
- `POST /api/habits/ai/recommendations` - Get personalized recommendations
- `POST /api/habits/ai/optimal-conditions` - Analyze optimal conditions

### Analytics Endpoints
- `POST /api/habits/analytics/optimized` - Get optimized analytics
- `GET /api/habits/analytics/export` - Export data to CSV

---

## Database Functions

### Streak Calculation
- `calculate_habit_streak(p_habit_id, p_as_of_date)` - Calculate streak for specific date
- `update_user_habit_streaks(p_user_id)` - Batch update all user streaks
- `trigger_update_habit_streaks()` - Automatic trigger on entry changes

### Analytics
- `get_habit_analytics_optimized(p_user_id, p_days, p_habit_ids)` - Optimized analytics query
- `get_habit_optimal_conditions(p_user_id, p_habit_id, p_days)` - Optimal conditions analysis

### Logging
- `log_habit_entry_safe(p_habit_id, p_user_id, p_date, p_value, p_notes)` - Safe entry logging with duplicate handling

---

## Current Limitations & Opportunities

### Notes Column - Currently Underutilized
The `notes` TEXT field in `habit_entries` exists but is not heavily used:
- **Current usage**: Basic free-form text storage
- **No structured parsing**: Notes are stored as plain text
- **No AI analysis**: Notes are not analyzed for patterns or insights
- **No search/filter**: Cannot search or filter by note content
- **No context extraction**: Rich context (mood, triggers, obstacles) not extracted

### Potential for Context-Aware Enhancement
The notes field could be leveraged for:
1. **Trigger identification**: "felt stressed", "after workout", "with friends"
2. **Obstacle tracking**: "too tired", "no time", "forgot"
3. **Success factors**: "morning routine helped", "accountability partner"
4. **Mood/emotion tracking**: Beyond 1-5 scale, capture nuanced feelings
5. **Environmental factors**: "rainy day", "busy at work", "weekend"
6. **Social context**: "alone", "with family", "at party"
7. **AI-powered insights**: Analyze notes for patterns and correlations

---

## Technology Stack

### Backend
- **Framework**: Astro API routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with multi-user support
- **Caching**: In-memory Map-based cache
- **AI**: Token-based AI service integration

### Frontend
- **Framework**: React (TSX components)
- **Styling**: Tailwind CSS
- **State Management**: React hooks
- **PWA**: Service worker, offline support

### Performance
- **Database**: Indexed queries, materialized views
- **Caching**: Multi-level caching strategy
- **Optimization**: Batch operations, lazy loading

---

## Testing

### Test Coverage
- Unit tests: `src/test/unit/habit-*.test.ts`
- Performance tests: `src/test/performance/habits-performance.test.ts`
- Integration tests: Streak calculation, logging, analytics

### Test Scenarios
- Habit creation validation
- Enhanced logging with context
- Streak calculation (build/break/maintain)
- Skip handling
- Partial completion
- Future date logging
- Duplicate prevention
- Performance benchmarks (10k+ habits, 100k+ entries)

---

## Integration Points

### Cross-Module Integration
- **Tasks**: Habit completion can trigger task scheduling
- **Health**: Health metrics correlation with habit success
- **Calendar**: Habit reminders integrated with calendar
- **Tokens**: AI features consume tokens
- **Life Score**: Habit completion affects overall life score

### External Integrations
- **Loop Habits**: Import from Loop Habits app
- **PWA**: Push notifications, offline support
- **Analytics**: Export to CSV for external analysis

---

## Performance Characteristics

### Scalability
- Handles 10,000+ habits per user
- Processes 100,000+ entries efficiently
- Sub-500ms response times with caching
- Batch operations for bulk updates

### Optimization Strategies
- Database-side calculations
- Aggressive caching
- Indexed queries
- Materialized views
- Lazy loading
- Pagination

---

## Next Steps for Enhancement

Based on this architecture, the notes column presents a significant opportunity for context-aware habit management. The infrastructure is already in place:
- ✅ Notes field exists in database
- ✅ Notes can be logged via API
- ✅ AI insights service is operational
- ✅ Token system for AI features
- ✅ Context tracking framework (mood, energy, location, tags)

**Missing pieces for context-aware notes**:
- ❌ Structured note parsing
- ❌ AI-powered note analysis
- ❌ Pattern extraction from notes
- ❌ Note-based insights and recommendations
- ❌ Search and filter by note content
- ❌ Note templates or suggestions
- ❌ Correlation between notes and success rates
