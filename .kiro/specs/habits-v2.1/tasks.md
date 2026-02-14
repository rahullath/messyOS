# Implementation Plan: Habits v2.1 - Actionable Habits Data

## Overview

This implementation plan breaks down the habits-v2.1 feature into discrete coding tasks. The approach is incremental: start with database schema, build core parsing and aggregation logic, expose the API, integrate with Chain View, and finally add UI enhancements.

Each task builds on previous tasks, with testing integrated throughout. The plan follows the append-only principle: minimal changes to existing code, maximum reuse of infrastructure.

## Tasks

- [x] 1. Database schema extensions and migrations
  - Create migration file for habit_entries table extensions
  - Add numeric_value column (DOUBLE PRECISION NULL)
  - Add parsed column (JSONB NULL)
  - Add source column (TEXT NULL)
  - Create indexes for performance (numeric_value, parsed GIN, source, date+user_id)
  - Test migration on development database
  - Verify backward compatibility with existing queries
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 1.1 Write unit tests for schema migration
  - Test columns exist with correct types and nullability
  - Test indexes are created
  - Test existing habit_entries remain valid
  - Test new entries can be created with NULL values
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Implement habit taxonomy system
  - [x] 2.1 Create src/lib/habits/taxonomy.ts
    - Define SemanticType enum with all types (NICOTINE_POUCHES, VAPING_PUFFS, POT_USE, etc.)
    - Define HabitTaxonomy interface
    - Implement normalizeUnit function with unit normalization map
    - Implement inferSemanticType function for habit name/unit inference
    - Implement isBreakHabit function for break habit detection
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 2.2 Write property test for unit normalization
    - **Property 5: Unit Normalization Consistency**
    - **Validates: Requirements 4.2**
    - Test that normalizing any unit from the map produces canonical form
    - Test that normalizing canonical form is idempotent
    - Use fast-check with 100 iterations
    - _Requirements: 4.2_
  
  - [ ]* 2.3 Write unit tests for taxonomy functions
    - Test inferSemanticType with various habit names
    - Test isBreakHabit for break vs build habits
    - Test edge cases: unknown habits, empty strings, special characters
    - _Requirements: 4.1, 4.3, 4.4_

- [x] 3. Implement deterministic notes parser
  - [x] 3.1 Create src/lib/habits/note-parser.ts
    - Define ParsedNoteData interface
    - Define all regex patterns (strength, count, time, method, type, etc.)
    - Implement parseNote function with pattern matching
    - Implement confidence scoring based on matches
    - Implement graceful degradation (always return valid object)
    - Handle edge cases: empty notes, very long notes, unicode
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_
  
  - [ ]* 3.2 Write property test for parser pattern extraction
    - **Property 3: Parser Pattern Extraction**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**
    - Generate random notes with known patterns
    - Verify all patterns are extracted correctly
    - Verify confidence >= 0.7 for valid patterns
    - Use fast-check with 100 iterations
    - _Requirements: 3.1-3.10_
  
  - [ ]* 3.3 Write property test for parser graceful degradation
    - **Property 4: Parser Graceful Degradation**
    - **Validates: Requirements 3.11**
    - Generate malformed/unparseable notes
    - Verify parser returns confidence < 0.5
    - Verify parse_method = 'failed'
    - Verify original text preserved
    - Use fast-check with 100 iterations
    - _Requirements: 3.11_
  
  - [ ]* 3.4 Write unit tests for specific patterns
    - Test strength extraction: "6mg", "13.5 mg", "50mg"
    - Test count ranges: "2-3 pouches", "1-2 sessions"
    - Test time ranges: "1:16-5:15am", "11pm-7am"
    - Test cannabis methods: "vaporizer", "bong", "edibles", "avb"
    - Test shower types: "reg shower", "head shower", "proper cleanse"
    - Test caffeine products: "monster", "lucozade", "red bull"
    - Test edge cases: empty notes, unicode, very long notes (>10KB)
    - _Requirements: 3.1-3.11_

- [x] 4. Checkpoint - Ensure parser tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement enhanced Loop Habits import
  - [x] 5.1 Create src/lib/import/enhanced-loop-habits-v2.ts
    - Extend existing import service for per-habit support
    - Implement detectImportFormat function (root vs per-habit)
    - Implement fuzzyMatchHabit function for habit name matching
    - Implement normalizeLoopValue function (divide by 1000 for numerical)
    - Implement extractNotesFromPerHabit function
    - Integrate with notes parser for parsed field population
    - Set source field appropriately (loop_root, loop_per_habit)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.6_
  
  - [ ]* 5.2 Write property test for Loop value normalization
    - **Property 1: Loop Value Normalization**
    - **Validates: Requirements 1.3**
    - Generate random numerical values
    - Verify dividing by 1000 produces correct internal value
    - Verify operation is reversible (multiply by 1000 to get original)
    - Use fast-check with 100 iterations
    - _Requirements: 1.3_
  
  - [ ]* 5.3 Write property test for import data preservation
    - **Property 2: Import Data Preservation**
    - **Validates: Requirements 1.2**
    - Generate random notes content
    - Import and verify notes preserved exactly
    - Test with unicode, special characters, long notes
    - Use fast-check with 100 iterations
    - _Requirements: 1.2_
  
  - [ ]* 5.4 Write unit tests for normalizeLoopValue
    - Test division by 1000 for numerical values
    - Test YES/NO/SKIP/UNKNOWN mapping to 0/1/2
    - Test edge cases: 0, negative, very large numbers
    - Test invalid inputs: non-numeric strings, null, undefined
    - _Requirements: 1.3, 1.4_
  
  - [ ]* 5.5 Write property test for source tracking
    - **Property 15: Source Tracking Completeness**
    - **Validates: Requirements 2.6**
    - Generate habit entries through various paths
    - Verify source field is always set (never NULL)
    - Verify source is one of: loop_root, loop_per_habit, manual, macro
    - Use fast-check with 100 iterations
    - _Requirements: 2.6_

- [x] 6. Update EnhancedLoopHabitsImport component
  - [x] 6.1 Extend src/components/import/EnhancedLoopHabitsImport.tsx
    - Add per-habit file upload support (multiple files)
    - Add import format detection UI
    - Add fuzzy matching preview with confidence scores
    - Add conflict resolution UI for per-habit imports
    - Wire to enhanced-loop-habits-v2 service
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 7. Checkpoint - Ensure import tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement daily context aggregator
  - [x] 8.1 Create src/lib/context/daily-context.ts
    - Define DailyContext interface with all fields
    - Implement generateDailyContext main function
    - Implement queryYesterdayHabits (WHERE date < D)
    - Implement queryTrailingWindow (7-30 days)
    - Implement aggregateSubstances (nicotine, cannabis, caffeine)
    - Implement aggregateMeds function
    - Implement aggregateHygiene function
    - Implement aggregateMeals function
    - Implement calculateDurationPriors (median from trailing window)
    - Implement detectRiskFlags (low_energy_risk, sleep_debt_risk)
    - Implement calculateReliability for each category
    - Handle fallback when yesterday has zero entries
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 6.8_
  
  - [ ]* 8.2 Write property test for temporal boundary enforcement
    - **Property 6: Temporal Boundary Enforcement**
    - **Validates: Requirements 5.1, 8.1, 8.6**
    - Generate random dates
    - Verify DailyContext only queries WHERE date < D
    - Verify current date entries are never included
    - Use fast-check with 100 iterations
    - _Requirements: 5.1, 8.1, 8.6_
  
  - [ ]* 8.3 Write property test for trailing window fallback
    - **Property 7: Trailing Window Fallback**
    - **Validates: Requirements 5.13**
    - Generate scenarios with zero yesterday entries
    - Verify fallback to trailing window medians
    - Verify reliability scores reflect fallback (< 0.5)
    - Use fast-check with 100 iterations
    - _Requirements: 5.13_
  
  - [ ]* 8.4 Write property test for aggregation completeness
    - **Property 8: Aggregation Completeness**
    - **Validates: Requirements 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10**
    - Generate random habit entry sets
    - Verify DailyContext has all required fields populated
    - Verify no missing fields even with sparse data
    - Use fast-check with 100 iterations
    - _Requirements: 5.4-5.10_
  
  - [ ]* 8.5 Write property test for reliability score bounds
    - **Property 9: Reliability Score Bounds**
    - **Validates: Requirements 5.14, 6.8**
    - Generate various data patterns (recent, sparse, inconsistent)
    - Verify reliability scores in range [0.0, 1.0]
    - Verify scores increase with more recent, complete, consistent data
    - Use fast-check with 100 iterations
    - _Requirements: 5.14, 6.8_
  
  - [ ]* 8.6 Write unit tests for aggregation functions
    - Test aggregateSubstances with various substance entries
    - Test aggregateMeds with taken/not taken scenarios
    - Test aggregateHygiene with shower, oral, skincare data
    - Test aggregateMeals with cooked meal counts
    - Test calculateDurationPriors with trailing window data
    - Test detectRiskFlags with various patterns
    - Test calculateReliability with different data quality
    - Test with zero entries, partial data, corrupted data
    - _Requirements: 5.4-5.14_

- [x] 9. Checkpoint - Ensure aggregator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement daily context API endpoint
  - [x] 10.1 Create src/pages/api/context/today.ts
    - Implement GET handler
    - Add authentication check (return 401 if not authenticated)
    - Generate DailyContext using aggregator
    - Implement 60s caching with cache service
    - Return DailyContext JSON response
    - Handle errors gracefully (503, 504, 400)
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.7_
  
  - [x] 10.2 Implement cache invalidation hooks
    - Add cache invalidation on new habit_entry
    - Add cache invalidation on new wake_event
    - Update habit logging endpoints to invalidate cache
    - Update wake_event endpoints to invalidate cache
    - _Requirements: 6.4, 6.5_
  
  - [ ]* 10.3 Write property test for cache invalidation consistency
    - **Property 10: Cache Invalidation Consistency**
    - **Validates: Requirements 6.4, 6.5**
    - Generate habit entries and wake events
    - Verify cache is invalidated immediately
    - Verify next request generates fresh DailyContext
    - Use fast-check with 100 iterations
    - _Requirements: 6.4, 6.5_
  
  - [ ]* 10.4 Write integration test for /api/context/today
    - Mock database with yesterday's habit entries
    - Mock wake_events table
    - Call API endpoint with valid authentication
    - Verify response status 200
    - Verify response matches DailyContext interface
    - Verify all required fields present
    - Test with no data (verify defaults and reliability = 0)
    - Test without authentication (verify 401)
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 12.5_
  
  - [ ]* 10.5 Write unit tests for API error handling
    - Test authentication errors (401, 403)
    - Test cache errors (fallback to fresh generation)
    - Test database errors (503, 504)
    - Test invalid responses (400)
    - _Requirements: 6.6_

- [x] 11. Checkpoint - Ensure API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Chain View integration service
  - [x] 12.1 Create src/lib/chains/context-integration.ts
    - Define ChainContextEnhancement interface
    - Implement enhanceChainWithContext main function
    - Implement generateExitGateSuggestions (meds, phone charger based on flags)
    - Implement injectMissingSteps (inject "Take meds" if not taken)
    - Implement applyDurationPriors (use DailyContext priors for step durations)
    - Implement calculateRiskInflators (10% for low_energy, 15% for sleep_debt)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 12.2 Write property test for chain generation determinism
    - **Property 11: Chain Generation Determinism**
    - **Validates: Requirements 8.5**
    - Generate chains at different times during same day
    - Verify identical chains (except wake_events)
    - Use fast-check with 100 iterations
    - _Requirements: 8.5_
  
  - [ ]* 12.3 Write property test for step injection correctness
    - **Property 12: Step Injection Correctness**
    - **Validates: Requirements 7.2**
    - Generate DailyContext with meds.taken = false, reliability > 0.5
    - Verify "Take meds" step injected with duration = 2 min
    - Use fast-check with 100 iterations
    - _Requirements: 7.2_
  
  - [ ]* 12.4 Write property test for duration prior application
    - **Property 13: Duration Prior Application**
    - **Validates: Requirements 7.3**
    - Generate chains with steps matching duration priors
    - Verify step durations adjusted to use priors
    - Use fast-check with 100 iterations
    - _Requirements: 7.3_
  
  - [ ]* 12.5 Write property test for risk inflator application
    - **Property 14: Risk Inflator Application**
    - **Validates: Requirements 7.4**
    - Generate chains with various risk flags
    - Verify total duration inflated correctly (10% low_energy, 15% sleep_debt)
    - Verify cumulative inflation when both flags set
    - Use fast-check with 100 iterations
    - _Requirements: 7.4_
  
  - [ ]* 12.6 Write unit tests for integration functions
    - Test generateExitGateSuggestions with various DailyContext states
    - Test injectMissingSteps with meds taken/not taken
    - Test applyDurationPriors with various priors
    - Test calculateRiskInflators with various flags
    - Test edge cases: missing priors, invalid durations, zero reliability
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 13. Update Chain View to consume DailyContext
  - [x] 13.1 Update src/lib/chains/chain-generator.ts
    - Add DailyContext fetch in generateChainsForDate
    - Pass DailyContext to enhanceChainWithContext
    - Apply exit gate suggestions to exit-gate steps
    - Apply injected steps to chain
    - Apply duration priors to step estimates
    - Apply risk inflators to total chain duration
    - Handle DailyContext fetch errors (use defaults)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 13.2 Update src/components/daily-plan/ChainView.tsx
    - Display duration ranges instead of single values (e.g., "8-12 min")
    - Display total chain length as range (e.g., "~55-75 min")
    - Display only "Complete by" constraints, not "Start by" times
    - Show reliability indicators for low-confidence data
    - Handle missing DailyContext gracefully
    - _Requirements: 7.5, 7.6, 7.7_

- [x] 14. Checkpoint - Ensure Chain View integration works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement notes-first logging UI (Nice-to-Have)
  - [x] 15.1 Create src/components/habits/NotesFirstLoggingUI.tsx
    - Create notes input component with chip suggestions
    - Implement chip generation based on semantic type
    - Add chips for nicotine: strength, count, timing
    - Add chips for shower: type, includes_skincare, includes_oral
    - Add chips for cannabis: method, sessions, shared/alone
    - Add chips for meals: count, type
    - Implement chip selection and note composition
    - Allow free-form text alongside chips
    - Wire to habit logging API
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 16. Implement habit creation upgrades (Nice-to-Have)
  - [x] 16.1 Update src/components/habits/HabitCreationModal.tsx
    - Add unit dropdown for numerical habits (pouches, puffs, meals, sessions, drinks, minutes)
    - Add target value and comparison type inputs (AT_LEAST, AT_MOST, EXACTLY)
    - Add semantic type selector (optional)
    - Auto-suggest units based on semantic type
    - Store semantic type in habit metadata
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 17. Implement AI enrichment fallback (Nice-to-Have)
  - [x] 17.1 Create src/lib/habits/ai-note-enrichment.ts
    - Implement AI enrichment function
    - Call AI only when deterministic parsing has low confidence
    - Mark enriched data with source: "ai_enriched"
    - Handle AI failures gracefully (use deterministic results)
    - Respect token balance
    - Allow disabling via configuration
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 18. Final checkpoint - End-to-end testing
  - Test complete flow: import → parse → aggregate → API → Chain View
  - Verify temporal boundaries respected throughout
  - Verify cache invalidation works correctly
  - Verify Chain View displays enhanced data
  - Verify error handling and graceful degradation
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (100 iterations minimum)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Nice-to-have tasks (15-17) can be deferred to future iterations
