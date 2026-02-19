# Requirements Document: Habits v2.1 - Actionable Habits Data

## Introduction

This feature enhances the existing habits module to make habits data actionable for Chain View and chain generation. The system will ingest Loop Habits exports with per-habit notes, normalize and structure notes into machine-usable signals, and expose "today context" and "duration priors" that Chain View can consume without requiring rewrites to existing v1.2 functionality.

The enhancement follows an append-only approach, leveraging existing infrastructure (enhanced logging, analytics, AI endpoints, caching, import UI) while adding minimal schema changes. The system implements temporal semantics where today's chain uses yesterday's habits plus recent history, not same-day data, ensuring deterministic behavior.

## Glossary

- **Loop_Habits**: Android habit tracking app that exports data in CSV format
- **Per_Habit_Export**: Individual CSV files for each habit containing checkmarks and notes
- **Root_Export**: Combined CSV files (Habits.csv, Checkmarks.csv, Scores.csv) from Loop Habits
- **Habit_Entry**: A single logged instance of habit completion/failure with metadata
- **Notes_Parser**: Deterministic parser that extracts structured data from free-form notes
- **Daily_Context**: Aggregated data structure containing yesterday's habits and recent patterns
- **Duration_Priors**: Historical time estimates for common activities (shower, meals, etc.)
- **Chain_View**: UI component that displays daily task chains with timing and dependencies
- **Semantic_Type**: Categorization of habits by their real-world meaning (NICOTINE_POUCHES, MEALS_COOKED, etc.)
- **Temporal_Semantics**: Rule that today's chain must not depend on today's habit entries
- **Wake_Events**: Same-day automatic signals from MacroDroid pipeline indicating wake time
- **Numeric_Value**: Quantified habit measurement (pouches, meals, sessions, etc.)
- **Parsed_Data**: JSONB structure containing extracted information from notes
- **Source_Type**: Origin of habit entry (loop_root, loop_per_habit, manual, macro)
- **Habit_Taxonomy**: Semantic classification system for habit types and units
- **Context_Aggregator**: Service that produces DailyContext from habit entries and wake events
- **Exit_Readiness_Gate**: Chain View feature that checks prerequisites before leaving home
- **Chain_Template**: Predefined sequence of steps that can be injected into daily chains
- **Trailing_Window**: Historical period (7-30 days) used for pattern analysis

## Requirements

### Requirement 1: Per-Habit Loop Habits Import

**User Story:** As a user, I want to import per-habit Loop Habits exports with notes, so that I can preserve detailed context from my habit tracking history.

#### Acceptance Criteria

1. WHEN a user selects per-habit checkmarks.csv files for import, THE Import_System SHALL detect the per-habit folder structure and match files to habits
2. WHEN a per-habit checkmarks.csv contains a Notes column, THE Import_System SHALL preserve all note content during import
3. WHEN importing numerical habit values from Loop Habits, THE Import_System SHALL normalize values by dividing by 1000
4. WHEN importing Loop Habits YES/NO/SKIP/UNKNOWN values, THE Import_System SHALL map them to the internal value system (0=missed, 1=completed, 2=skipped)
5. WHEN habit names don't match exactly, THE Import_System SHALL use fuzzy matching to suggest corresponding habits
6. WHEN per-habit imports conflict with existing entries, THE Import_System SHALL provide conflict resolution options (merge, replace, skip, rename)

### Requirement 2: Schema Extensions for Structured Data

**User Story:** As a developer, I want minimal schema additions to habit_entries, so that I can store structured habit data without breaking existing functionality.

#### Acceptance Criteria

1. THE Database_Schema SHALL add a numeric_value column of type DOUBLE PRECISION NULL to habit_entries
2. THE Database_Schema SHALL add a parsed column of type JSONB NULL to habit_entries
3. THE Database_Schema SHALL add a source column of type TEXT NULL to habit_entries
4. WHEN a habit entry is created without numeric_value, THE System SHALL allow NULL values
5. WHEN a habit entry is created without parsed data, THE System SHALL allow NULL values
6. WHEN a habit entry is created, THE System SHALL record the source as one of: loop_root, loop_per_habit, manual, macro

### Requirement 3: Deterministic Notes Parser

**User Story:** As a user, I want my habit notes to be automatically parsed into structured data, so that patterns and quantities are machine-readable without manual tagging.

#### Acceptance Criteria

1. WHEN a habit note contains strength patterns like "6mg" or "13.5 mg", THE Notes_Parser SHALL extract numeric strength and unit
2. WHEN a habit note contains count ranges like "2-3 pouches", THE Notes_Parser SHALL extract min and max values
3. WHEN a habit note contains "sesh" or "session", THE Notes_Parser SHALL identify it as a cannabis session count
4. WHEN a habit note contains cannabis method keywords (edibles, avb, vaporizer, bong), THE Notes_Parser SHALL extract the consumption method
5. WHEN a habit note contains shower type keywords (only water, proper cleanse, head shower, reg shower), THE Notes_Parser SHALL categorize the shower type
6. WHEN a habit note contains hygiene keywords (oral hygiene, skincare), THE Notes_Parser SHALL flag those activities
7. WHEN a habit note contains caffeine product names (monster, lucozade, red bull), THE Notes_Parser SHALL identify the caffeine product and brand
8. WHEN a habit note contains time ranges like "1:16-5:15am", THE Notes_Parser SHALL extract sleep start and end times
9. WHEN a habit note contains social context (with friends, alone, at party), THE Notes_Parser SHALL extract social context
10. WHEN a habit note contains duration indicators (3 hours, 45m), THE Notes_Parser SHALL extract duration in minutes
11. WHEN parsing fails or produces ambiguous results, THE Notes_Parser SHALL store the original note text without failing

### Requirement 4: Habit Taxonomy System

**User Story:** As a system architect, I want semantic habit types with normalized units, so that different habit names can be understood consistently across the system.

#### Acceptance Criteria

1. THE Habit_Taxonomy SHALL support semantic types: NICOTINE_POUCHES, VAPING_PUFFS, POT_USE, ENERGY_DRINK, MEALS_COOKED, ORAL_HYGIENE_SESSIONS, SHOWER, SKINCARE, MEDS, STEP_OUT, SOCIALIZE, GYM, SLEEP_PROXY
2. THE Habit_Taxonomy SHALL normalize unit names: "mealy" to "meals", "session" to "session", "pouch" to "pouch"
3. WHEN a habit is classified as a break habit (No Pot, No Energy Drink), THE Habit_Taxonomy SHALL interpret success as NOT doing the activity
4. WHEN a habit is classified as a build habit (Meals, Gym), THE Habit_Taxonomy SHALL interpret success as doing the activity
5. WHEN a habit has a numerical target, THE Habit_Taxonomy SHALL store the target value and comparison operator (AT_LEAST, AT_MOST)

### Requirement 5: Daily Context Aggregation

**User Story:** As a Chain View user, I want today's context to reflect yesterday's habits and recent patterns, so that my daily chain is informed by actual behavior without depending on incomplete same-day data.

#### Acceptance Criteria

1. WHEN generating daily context for date D, THE Context_Aggregator SHALL use habit_entries from date D-1 (yesterday)
2. WHEN generating daily context, THE Context_Aggregator SHALL analyze a trailing window of 7-30 days for pattern detection
3. WHEN wake_events exist for date D, THE Context_Aggregator SHALL include same-day wake time as the only automatic same-day signal
4. WHEN aggregating nicotine data, THE Context_Aggregator SHALL calculate total pouches, average strength_mg, and last_used_time
5. WHEN aggregating cannabis data, THE Context_Aggregator SHALL calculate total sessions, primary method, and last_used_time
6. WHEN aggregating caffeine data, THE Context_Aggregator SHALL list drinks consumed and last_used_time
7. WHEN aggregating hygiene data, THE Context_Aggregator SHALL determine if shower was done, shower type, oral hygiene sessions, and skincare completion
8. WHEN aggregating meal data, THE Context_Aggregator SHALL estimate cooked meals count and likely total meal count (0-3)
9. WHEN meds were not taken yesterday, THE Context_Aggregator SHALL set meds.taken to false
10. WHEN calculating duration priors, THE Context_Aggregator SHALL compute median durations for: bathroom, hygiene, shower, dress, pack, cook_simple_meal
11. WHEN detecting low energy risk, THE Context_Aggregator SHALL flag if caffeine was consumed late or sleep was insufficient
12. WHEN detecting sleep debt risk, THE Context_Aggregator SHALL flag if recent sleep patterns show consistent late wake times
13. WHEN yesterday (D-1) has zero habit entries, THE Context_Aggregator SHALL fall back to trailing window medians for duration priors and patterns
14. WHEN calculating reliability scores, THE Context_Aggregator SHALL base scores on data recency, completeness, and consistency within the trailing window

### Requirement 6: Daily Context API Endpoint

**User Story:** As a Chain View developer, I want a cached API endpoint for today's context, so that I can fetch actionable habit data without expensive recomputation.

#### Acceptance Criteria

1. THE System SHALL provide a GET /api/context/today endpoint
2. WHEN /api/context/today is called, THE System SHALL return a DailyContext object with wake time, substances, meds, hygiene, meals, day_flags, and duration_priors
3. WHEN /api/context/today is called, THE System SHALL cache the response for 60 seconds
4. WHEN a new habit entry is logged, THE System SHALL invalidate the /api/context/today cache
5. WHEN a new wake_event is recorded, THE System SHALL invalidate the /api/context/today cache
6. WHEN the user is not authenticated, THE System SHALL return 401 Unauthorized
7. WHEN no data exists for yesterday, THE System SHALL return a DailyContext with default values and reliability scores of 0
8. THE DailyContext SHALL include per-category reliability scores (0.0-1.0) indicating data confidence for nicotine, cannabis, caffeine, sleep, meals, hygiene, and meds

### Requirement 7: Chain View Integration Points

**User Story:** As a user, I want Chain View to use my habit data for suggestions and step injection, so that my daily plan reflects my actual patterns and needs.

#### Acceptance Criteria

1. WHEN Chain View generates exit readiness suggestions, THE System SHALL prefill suggestions based on DailyContext (phone charged if low_energy_risk, meds if not taken)
2. WHEN Chain View generates a chain and meds were not taken yesterday, THE System SHALL inject a "Take meds" step into the morning routine
3. WHEN Chain View estimates step durations, THE System SHALL use duration_priors from DailyContext for realistic timing
4. WHEN Chain View calculates total chain duration, THE System SHALL apply risk inflators (add 10% if low_energy_risk, add 15% if sleep_debt_risk)
5. WHEN Chain View displays step timing, THE System SHALL show duration ranges based on historical variance (e.g., "8-12 min" for shower)
6. WHEN Chain View displays chain metadata, THE System SHALL show total chain length as a range (e.g., "~55-75 min") without imposing a hard start time
7. WHEN Chain View displays deadlines, THE System SHALL only show "Complete by" constraints, not "Start by" times

### Requirement 8: Temporal Semantics Enforcement

**User Story:** As a system architect, I want strict temporal boundaries between today's chain and today's habits, so that chain generation is deterministic and doesn't create circular dependencies.

#### Acceptance Criteria

1. THE Context_Aggregator SHALL NOT include habit_entries from the current date when generating DailyContext
2. WHEN a user logs a habit during the day, THE System SHALL improve tomorrow's chain, not today's
3. WHEN wake_events are used as same-day signals, THE System SHALL prioritize them as authoritative over any other same-day data
4. WHEN manual overrides exist for same-day data, THE System SHALL respect them as secondary to wake_events
5. WHEN generating a chain at any time during day D, THE System SHALL produce identical results (except for wake_events and manual overrides)
6. WHEN testing temporal semantics, THE System SHALL verify that DailyContext for date D only queries habit_entries WHERE date < D

### Requirement 9: Notes-First Logging UI Enhancement

**User Story:** As a user, I want a notes-first logging interface with structured suggestions, so that I can quickly log habits with rich context using recognized patterns.

#### Acceptance Criteria

1. WHEN logging a habit with notes, THE UI SHALL display structured chip suggestions based on habit semantic type
2. WHEN logging a nicotine habit, THE UI SHALL suggest chips for: strength (3mg, 6mg, 13.5mg, 50mg), count (1, 2, 3+), timing (morning, afternoon, evening)
3. WHEN logging a shower habit, THE UI SHALL suggest chips for: type (reg shower, head shower, proper cleanse, only water), includes_skincare, includes_oral
4. WHEN logging a cannabis habit, THE UI SHALL suggest chips for: method (vaporizer, bong, edibles, avb), sessions (0.5, 1, 1.5, 2+), shared/alone
5. WHEN logging a meal habit, THE UI SHALL suggest chips for: meal count (1, 2, 3), meal type (cooked, takeout, simple)
6. WHEN a user selects chips, THE UI SHALL compose a note string that the parser can understand
7. WHEN a user types free-form notes, THE UI SHALL still allow submission without chip selection

### Requirement 10: Habit Creation Upgrades for Numerical Habits

**User Story:** As a user, I want to create numerical habits with controlled unit lists, so that my habit data is consistent and parseable.

#### Acceptance Criteria

1. WHEN creating a numerical habit, THE UI SHALL provide a dropdown of recognized units: pouches, puffs, meals, sessions, drinks, minutes
2. WHEN creating a numerical habit, THE UI SHALL allow setting a target value and comparison type (AT_LEAST, AT_MOST, EXACTLY)
3. WHEN creating a numerical habit, THE UI SHALL optionally allow semantic type selection from the taxonomy
4. WHEN a user selects a semantic type, THE UI SHALL auto-suggest appropriate units (NICOTINE_POUCHES → pouches, MEALS_COOKED → meals)
5. WHEN a habit is created with a semantic type, THE System SHALL store the semantic type in habit metadata

### Requirement 11: Loop Import Mapping Preview

**User Story:** As a user, I want to preview how Loop Habits will map to my existing habits, so that I can verify the import before committing changes.

#### Acceptance Criteria

1. WHEN uploading Loop Habits files, THE UI SHALL display a mapping preview showing Loop habit name → existing habit name
2. WHEN fuzzy matching suggests a habit, THE UI SHALL show the confidence score (0-100%)
3. WHEN no match is found, THE UI SHALL indicate "New habit will be created"
4. WHEN conflicts exist, THE UI SHALL highlight them in the preview with resolution options
5. WHEN the user approves the mapping, THE System SHALL proceed with import using the confirmed mappings

### Requirement 12: Unit Testing for Critical Parsers

**User Story:** As a developer, I want comprehensive unit tests for the notes parser and value normalizer, so that parsing errors don't silently corrupt habit data.

#### Acceptance Criteria

1. THE Test_Suite SHALL include unit tests for all Notes_Parser extraction patterns (strength, count, methods, types)
2. THE Test_Suite SHALL include unit tests for normalizeLoopValue function covering the *1000 division
3. THE Test_Suite SHALL include tests for edge cases: empty notes, malformed patterns, mixed units, unicode characters
4. THE Test_Suite SHALL include tests for parser failure modes ensuring graceful degradation
5. THE Test_Suite SHALL include at least one integration test for /api/context/today with mocked database

### Requirement 13: AI Enrichment as Optional Fallback

**User Story:** As a user, I want AI to enrich my habit notes when deterministic parsing is insufficient, so that ambiguous notes can still provide value without blocking the core system.

#### Acceptance Criteria

1. WHEN deterministic parsing produces low-confidence results, THE System MAY invoke AI enrichment as a fallback
2. WHEN AI enrichment is used, THE System SHALL mark the parsed data with source: "ai_enriched"
3. WHEN AI enrichment fails or is unavailable, THE System SHALL use deterministic parsing results only
4. WHEN AI enrichment is invoked, THE System SHALL respect token balance and fail gracefully if insufficient
5. WHEN AI enrichment is disabled in configuration, THE System SHALL skip AI processing entirely

### Requirement 14: Structured Chips Note UI (Nice-to-Have)

**User Story:** As a user, I want to compose notes using visual chips that snap together, so that logging is faster and more consistent than typing.

#### Acceptance Criteria

1. WHEN the structured chips UI is enabled, THE UI SHALL display category-based chip groups (quantity, method, timing, context)
2. WHEN a user taps a chip, THE UI SHALL add it to the note composition area
3. WHEN multiple chips are selected, THE UI SHALL format them with appropriate separators
4. WHEN a user wants to add custom text, THE UI SHALL provide a text input alongside chips
5. WHEN a note is submitted, THE UI SHALL combine chips and custom text into a parseable note string

### Requirement 15: Habit Semantic Config UI (Nice-to-Have)

**User Story:** As a user, I want to manually override semantic types for my habits, so that I can correct misclassifications or customize behavior.

#### Acceptance Criteria

1. WHEN viewing habit settings, THE UI SHALL display the current semantic type (if any)
2. WHEN editing a habit, THE UI SHALL allow selecting a semantic type from the taxonomy
3. WHEN a semantic type is changed, THE System SHALL reprocess recent habit_entries with the new semantic type
4. WHEN a semantic type is removed, THE System SHALL fall back to generic parsing
5. WHEN a semantic type is set, THE UI SHALL update chip suggestions to match the new type
