# Design Document: Habits v2.1 - Actionable Habits Data

## Overview

This design implements an enhancement to the existing habits module that makes habit data actionable for Chain View and chain generation. The system ingests Loop Habits exports with per-habit notes, parses notes into structured data using deterministic patterns, and exposes a "daily context" API that Chain View can consume without requiring rewrites to existing v1.2 functionality.

### Key Design Principles

1. **Append-Only Architecture**: No new engines, no new folder structures, minimal schema changes
2. **Leverage Existing Infrastructure**: Reuse enhanced logging, analytics, AI endpoints, caching, import UI
3. **Temporal Semantics**: Today's chain uses yesterday's habits + recent history (not same-day data)
4. **Deterministic First**: Parser works without AI dependency; AI is optional enrichment
5. **Graceful Degradation**: System functions with missing data, low confidence scores, or service failures

### Architecture Diagram

```mermaid
graph TB
    subgraph "Data Ingestion Layer"
        A[Loop Habits Export] --> B[Enhanced Import Service]
        B --> C[Per-Habit Parser]
        C --> D[Notes Parser]
        D --> E[habit_entries Table]
    end
    
    subgraph "Data Storage Layer"
        E --> F[numeric_value]
        E --> G[parsed JSONB]
        E --> H[source]
        E --> I[existing fields]
    end
    
    subgraph "Aggregation Layer"
        E --> J[Daily Context Aggregator]
        K[wake_events Table] --> J
        J --> L[Trailing Window Analyzer]
        L --> M[Duration Priors Calculator]
        L --> N[Risk Flags Detector]
        M --> O[DailyContext Object]
        N --> O
    end
    
    subgraph "API Layer"
        O --> P[/api/context/today]
        P --> Q[60s Cache]
        Q --> R[Chain View]
    end
    
    subgraph "Chain View Integration"
        R --> S[Exit Gate Prefill]
        R --> T[Step Injection]
        R --> U[Duration Estimation]
        R --> V[Risk Inflators]
    end
    
    subgraph "UI Enhancements"
        W[Notes-First Logging UI] --> X[Structured Chips]
        X --> D
        Y[Habit Creation UI] --> Z[Semantic Type Selector]
        Z --> AA[Habit Taxonomy]
    end
```

## Architecture

### System Layers

The system is organized into five distinct layers:

1. **Data Ingestion Layer**: Handles Loop Habits import with per-habit notes support
2. **Data Storage Layer**: Minimal schema extensions to habit_entries table
3. **Aggregation Layer**: Processes habit data into actionable daily context
4. **API Layer**: Exposes cached daily context endpoint
5. **Integration Layer**: Connects daily context to Chain View features

### Temporal Boundaries

**Critical Design Constraint**: Today's chain MUST NOT depend on today's habit_entries.

**Temporal Rules**:
- DailyContext for date D queries: `WHERE date < D` (strictly less than)
- Primary data source: Yesterday (D-1)
- Secondary data source: Trailing window (D-7 to D-30)
- Exception: wake_events are the ONLY same-day automatic signal
- Manual overrides (if added later) are secondary to wake_events

**Rationale**: This ensures deterministic chain generation and avoids circular dependencies where logging a habit during the day would change the chain that's already in progress.

### Data Flow

1. User imports Loop Habits export (root or per-habit)
2. Import service detects format and routes to appropriate parser
3. Notes parser extracts structured data using deterministic patterns
4. Data stored in habit_entries with numeric_value, parsed, source
5. Daily Context Aggregator queries yesterday's data + trailing window
6. Aggregator calculates substances, hygiene, meals, duration priors, risk flags
7. DailyContext cached for 60s, invalidated on new habit/wake event
8. Chain View fetches DailyContext and uses it for suggestions, injection, timing


## Components and Interfaces

### 1. Enhanced Loop Habits Import Service

**Location**: `src/lib/import/enhanced-loop-habits-v2.ts`

**Purpose**: Extends existing import to support per-habit checkmarks with notes.

**Interface**:
```typescript
interface PerHabitImportOptions {
  files: File[]; // Array of per-habit checkmarks.csv files
  userId: string;
  conflictResolution?: ConflictResolution[];
}

interface ImportResult {
  success: boolean;
  importedHabits: number;
  importedEntries: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

async function importPerHabitCheckmarks(
  options: PerHabitImportOptions
): Promise<ImportResult>
```

**Key Functions**:
- `detectImportFormat(files: File[]): 'root' | 'per-habit'` - Detect export format
- `fuzzyMatchHabit(habitName: string, existingHabits: Habit[]): Habit | null` - Match habits
- `normalizeLoopValue(value: string, type: 'NUMERICAL' | 'YES_NO'): number` - Normalize values
- `extractNotesFromPerHabit(row: CSVRow): string | null` - Extract notes column


### 2. Notes Parser

**Location**: `src/lib/habits/note-parser.ts`

**Purpose**: Deterministic extraction of structured data from free-form notes.

**Interface**:
```typescript
interface ParsedNoteData {
  // Quantities
  count?: number;
  count_range?: { min: number; max: number };
  strength_mg?: number;
  duration_minutes?: number;
  
  // Substances
  nicotine?: {
    method: 'pouch' | 'vape' | 'other';
    strength_mg?: number;
    count?: number;
  };
  cannabis?: {
    method: 'vaporizer' | 'bong' | 'edibles' | 'avb' | 'joint' | 'other';
    sessions?: number;
    shared?: boolean;
  };
  caffeine?: {
    product: string;
    brand?: string;
  };
  
  // Hygiene
  shower?: {
    type: 'reg_shower' | 'head_shower' | 'proper_cleanse' | 'only_water';
    includes_skincare?: boolean;
    includes_oral?: boolean;
  };
  oral_hygiene?: {
    sessions: number;
  };
  skincare?: {
    done: boolean;
  };
  
  // Sleep
  sleep?: {
    slept_from?: string; // ISO time
    slept_to?: string; // ISO time
  };
  
  // Social
  social?: {
    context?: string;
    duration_minutes?: number;
    location?: string;
  };
  
  // Tags
  tags?: string[];
  
  // Confidence
  confidence: number; // 0.0-1.0
  parse_method: 'deterministic' | 'ai_enriched' | 'failed';
}

function parseNote(note: string, semanticType?: SemanticType): ParsedNoteData
```

**Parsing Patterns**:
```typescript
const PATTERNS = {
  strength: /(\d+(?:\.\d+)?)\s*mg/i,
  count_range: /(\d+)\s*-\s*(\d+)/,
  count_single: /(\d+)\s*(pouch|puff|sesh|session|meal)/i,
  time_range: /(\d{1,2}):(\d{2})\s*(?:am|pm)?\s*-\s*(\d{1,2}):(\d{2})\s*(?:am|pm)?/i,
  duration: /(\d+)\s*(hour|hr|min|minute)/i,
  
  // Cannabis
  cannabis_method: /(vaporizer|bong|edible|avb|joint)/i,
  cannabis_session: /(\d+(?:\.\d+)?)\s*sesh/i,
  cannabis_shared: /(shared|with|together)/i,
  
  // Shower
  shower_type: /(reg shower|head shower|proper cleanse|only water|complete cleanse)/i,
  shower_includes: /(skincare|oral hygiene)/i,
  
  // Caffeine
  caffeine_product: /(monster|lucozade|red bull|sneak)/i,
  
  // Social
  social_context: /(with friends|alone|at party|with \w+)/i,
  social_location: /(at \w+|in \w+)/i,
};
```


### 3. Habit Taxonomy System

**Location**: `src/lib/habits/taxonomy.ts`

**Purpose**: Semantic classification of habits with normalized units.

**Interface**:
```typescript
enum SemanticType {
  NICOTINE_POUCHES = 'NICOTINE_POUCHES',
  VAPING_PUFFS = 'VAPING_PUFFS',
  POT_USE = 'POT_USE',
  ENERGY_DRINK = 'ENERGY_DRINK',
  MEALS_COOKED = 'MEALS_COOKED',
  ORAL_HYGIENE_SESSIONS = 'ORAL_HYGIENE_SESSIONS',
  SHOWER = 'SHOWER',
  SKINCARE = 'SKINCARE',
  MEDS = 'MEDS',
  STEP_OUT = 'STEP_OUT',
  SOCIALIZE = 'SOCIALIZE',
  GYM = 'GYM',
  SLEEP_PROXY = 'SLEEP_PROXY',
}

interface HabitTaxonomy {
  semantic_type: SemanticType;
  normalized_unit: string; // 'pouches', 'puffs', 'meals', 'sessions', 'drinks', 'minutes'
  is_break_habit: boolean; // true for "No Pot", "No Energy Drink"
  target_operator?: 'AT_LEAST' | 'AT_MOST' | 'EXACTLY';
  target_value?: number;
}

function inferSemanticType(habitName: string, unit?: string): SemanticType | null
function normalizeUnit(unit: string): string
function isBreakHabit(semanticType: SemanticType): boolean
```

**Unit Normalization Map**:
```typescript
const UNIT_NORMALIZATION: Record<string, string> = {
  'mealy': 'meals',
  'meal': 'meals',
  'session': 'sessions',
  'sesh': 'sessions',
  'pouch': 'pouches',
  'puff': 'puffs',
  'drink': 'drinks',
  'min': 'minutes',
  'minute': 'minutes',
};
```


### 4. Daily Context Aggregator

**Location**: `src/lib/context/daily-context.ts`

**Purpose**: Aggregate yesterday's habits + trailing window into actionable context.

**Interface**:
```typescript
interface DailyContext {
  date: string; // ISO date
  
  wake: {
    timestamp?: string; // ISO timestamp
    source?: 'wake_events' | 'habit' | 'manual';
    reliability: number; // 0.0-1.0
  };
  
  substances: {
    nicotine: {
      used: boolean;
      pouches?: number;
      strength_mg?: number;
      last_used_time?: string;
      reliability: number;
    };
    cannabis: {
      used: boolean;
      sessions?: number;
      method?: string;
      last_used_time?: string;
      reliability: number;
    };
    caffeine: {
      used: boolean;
      drinks?: string[];
      last_used_time?: string;
      reliability: number;
    };
  };
  
  meds: {
    taken: boolean;
    last_taken_time?: string;
    reliability: number;
  };
  
  hygiene: {
    shower_done: boolean;
    shower_type?: string;
    oral_sessions?: number;
    skincare_done?: boolean;
    reliability: number;
  };
  
  meals: {
    cooked_meals?: number;
    likely_meal_count?: 0 | 1 | 2 | 3;
    reliability: number;
  };
  
  day_flags: {
    low_energy_risk: boolean;
    sleep_debt_risk: boolean;
  };
  
  duration_priors: {
    bathroom_min: number;
    hygiene_min: number;
    shower_min: number;
    dress_min: number;
    pack_min: number;
    cook_simple_meal_min: number;
  };
}

async function generateDailyContext(
  userId: string,
  date: Date
): Promise<DailyContext>
```

**Key Functions**:
- `queryYesterdayHabits(userId: string, date: Date): Promise<HabitEntry[]>`
- `queryTrailingWindow(userId: string, date: Date, days: number): Promise<HabitEntry[]>`
- `aggregateSubstances(entries: HabitEntry[]): DailyContext['substances']`
- `calculateDurationPriors(entries: HabitEntry[]): DailyContext['duration_priors']`
- `detectRiskFlags(entries: HabitEntry[], wakeTime?: Date): DailyContext['day_flags']`
- `calculateReliability(entries: HabitEntry[], category: string): number`


### 5. Daily Context API Endpoint

**Location**: `src/pages/api/context/today.ts`

**Purpose**: Expose cached daily context for Chain View consumption.

**Interface**:
```typescript
// GET /api/context/today
// Response: DailyContext

// Cache Strategy:
// - TTL: 60 seconds
// - Invalidation triggers: new habit_entry, new wake_event
// - Cache key: `daily-context:${userId}:${date}`
```

**Implementation**:
```typescript
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }
  
  const today = new Date();
  const cacheKey = `daily-context:${session.user.id}:${today.toISOString().split('T')[0]}`;
  
  // Check cache
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Generate context
  const context = await generateDailyContext(session.user.id, today);
  
  // Cache for 60s
  await cacheService.set(cacheKey, context, 60);
  
  return new Response(JSON.stringify(context), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```


### 6. Chain View Integration Service

**Location**: `src/lib/chains/context-integration.ts`

**Purpose**: Connect DailyContext to Chain View features.

**Interface**:
```typescript
interface ChainContextEnhancement {
  exitGateSuggestions: GateCondition[];
  injectedSteps: ChainStep[];
  durationAdjustments: Record<string, number>;
  riskInflators: {
    low_energy: number; // 1.0 = no change, 1.1 = +10%
    sleep_debt: number; // 1.0 = no change, 1.15 = +15%
  };
}

async function enhanceChainWithContext(
  chain: ExecutionChain,
  context: DailyContext
): Promise<ChainContextEnhancement>

function generateExitGateSuggestions(context: DailyContext): GateCondition[]
function injectMissingSteps(chain: ExecutionChain, context: DailyContext): ChainStep[]
function applyDurationPriors(chain: ExecutionChain, context: DailyContext): void
function calculateRiskInflators(context: DailyContext): { low_energy: number; sleep_debt: number }
```

**Exit Gate Suggestions Logic**:
```typescript
function generateExitGateSuggestions(context: DailyContext): GateCondition[] {
  const suggestions: GateCondition[] = [
    { id: 'keys', name: 'Keys present', satisfied: false }, // always
    { id: 'phone', name: 'Phone charged >= 20%', satisfied: false }, // always
    { id: 'water', name: 'Water bottle filled', satisfied: false }, // always
  ];
  
  // Add meds if not taken yesterday
  if (!context.meds.taken && context.meds.reliability > 0.5) {
    suggestions.push({
      id: 'meds',
      name: 'Meds taken',
      satisfied: false,
    });
  }
  
  // Add phone charger if low energy risk
  if (context.day_flags.low_energy_risk) {
    suggestions.push({
      id: 'phone-charger',
      name: 'Phone charger packed',
      satisfied: false,
    });
  }
  
  return suggestions;
}
```

**Step Injection Logic**:
```typescript
function injectMissingSteps(chain: ExecutionChain, context: DailyContext): ChainStep[] {
  const injected: ChainStep[] = [];
  
  // Inject "Take meds" if not taken yesterday
  if (!context.meds.taken && context.meds.reliability > 0.5) {
    injected.push({
      id: 'take-meds',
      name: 'Take meds',
      duration_estimate: 2, // 2 minutes
      is_required: true,
      can_skip_when_late: false,
    });
  }
  
  return injected;
}
```


## Data Models

### Database Schema Extensions

**Table**: `habit_entries`

**New Columns**:
```sql
ALTER TABLE habit_entries
ADD COLUMN numeric_value DOUBLE PRECISION NULL,
ADD COLUMN parsed JSONB NULL,
ADD COLUMN source TEXT NULL;

-- Indexes for performance
CREATE INDEX idx_habit_entries_numeric_value ON habit_entries(numeric_value) WHERE numeric_value IS NOT NULL;
CREATE INDEX idx_habit_entries_parsed ON habit_entries USING GIN(parsed) WHERE parsed IS NOT NULL;
CREATE INDEX idx_habit_entries_source ON habit_entries(source) WHERE source IS NOT NULL;
CREATE INDEX idx_habit_entries_date_user ON habit_entries(date, user_id);
```

**Column Descriptions**:
- `numeric_value`: Quantified measurement (pouches, meals, sessions, etc.)
- `parsed`: JSONB structure containing extracted note data (see ParsedNoteData interface)
- `source`: Origin of entry ('loop_root', 'loop_per_habit', 'manual', 'macro')

**Backward Compatibility**:
- All new columns are nullable
- Existing queries continue to work unchanged
- Existing habit_entries remain valid without new columns

### Habit Metadata Extension

**Table**: `habits`

**New Optional Field** (stored in existing metadata JSONB):
```typescript
interface HabitMetadata {
  // Existing fields...
  
  // New V2.1 fields
  semantic_type?: SemanticType;
  normalized_unit?: string;
  is_break_habit?: boolean;
}
```

**No Schema Change Required**: Uses existing `metadata` JSONB column.


### DailyContext Data Model

**Full TypeScript Definition**:
```typescript
interface DailyContext {
  date: string; // ISO date (YYYY-MM-DD)
  
  wake: {
    timestamp?: string; // ISO timestamp
    source?: 'wake_events' | 'habit' | 'manual';
    reliability: number; // 0.0-1.0
  };
  
  substances: {
    nicotine: {
      used: boolean;
      pouches?: number;
      strength_mg?: number;
      last_used_time?: string; // ISO timestamp
      reliability: number; // 0.0-1.0
    };
    cannabis: {
      used: boolean;
      sessions?: number;
      method?: 'vaporizer' | 'bong' | 'edibles' | 'avb' | 'joint' | 'other';
      last_used_time?: string; // ISO timestamp
      reliability: number; // 0.0-1.0
    };
    caffeine: {
      used: boolean;
      drinks?: string[]; // ['monster ultra white', 'red bull']
      last_used_time?: string; // ISO timestamp
      reliability: number; // 0.0-1.0
    };
  };
  
  meds: {
    taken: boolean;
    last_taken_time?: string; // ISO timestamp
    reliability: number; // 0.0-1.0
  };
  
  hygiene: {
    shower_done: boolean;
    shower_type?: 'reg_shower' | 'head_shower' | 'proper_cleanse' | 'only_water';
    oral_sessions?: number;
    skincare_done?: boolean;
    reliability: number; // 0.0-1.0
  };
  
  meals: {
    cooked_meals?: number;
    likely_meal_count?: 0 | 1 | 2 | 3;
    reliability: number; // 0.0-1.0
  };
  
  day_flags: {
    low_energy_risk: boolean; // caffeine late or sleep insufficient
    sleep_debt_risk: boolean; // consistent late wake times
  };
  
  duration_priors: {
    bathroom_min: number; // median from trailing window
    hygiene_min: number; // median from trailing window
    shower_min: number; // median from trailing window
    dress_min: number; // median from trailing window
    pack_min: number; // median from trailing window
    cook_simple_meal_min: number; // median from trailing window
  };
}
```

**Reliability Score Calculation**:
```typescript
function calculateReliability(
  entries: HabitEntry[],
  category: string,
  trailingWindowDays: number
): number {
  // Factors:
  // 1. Recency: More recent data = higher reliability
  // 2. Completeness: More entries = higher reliability
  // 3. Consistency: Less variance = higher reliability
  
  const recentEntries = entries.filter(e => 
    isWithinDays(e.date, trailingWindowDays)
  );
  
  if (recentEntries.length === 0) return 0.0;
  
  const recencyScore = Math.min(1.0, recentEntries.length / trailingWindowDays);
  const completenessScore = Math.min(1.0, recentEntries.length / 7); // 7 days ideal
  const consistencyScore = calculateConsistency(recentEntries);
  
  return (recencyScore * 0.4 + completenessScore * 0.3 + consistencyScore * 0.3);
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Loop Value Normalization

*For any* numerical value from Loop Habits export, dividing by 1000 should produce the correct internal value, and the operation should be reversible (multiply by 1000 to get original).

**Validates: Requirements 1.3**

**Rationale**: The *1000 issue is explicitly called out as critical. This round-trip property ensures we don't lose data or introduce rounding errors.

### Property 2: Import Data Preservation

*For any* habit entry with notes imported from Loop Habits, the notes content should be preserved exactly as it appears in the source CSV (no truncation, no encoding issues, no data loss).

**Validates: Requirements 1.2**

**Rationale**: Notes are the primary source of structured data. Any loss during import would corrupt the entire feature.

### Property 3: Parser Pattern Extraction

*For any* note containing recognized patterns (strength, count, time, method, type), the parser should extract all matching patterns and store them in the parsed JSONB field with confidence >= 0.7.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

**Rationale**: This is the core parsing property. Instead of testing each pattern separately, we test that the parser correctly identifies and extracts all recognized patterns.

### Property 4: Parser Graceful Degradation

*For any* malformed or unparseable note, the parser should return a ParsedNoteData object with confidence < 0.5, parse_method = 'failed', and the original note text preserved.

**Validates: Requirements 3.11**

**Rationale**: Parsing errors should never crash the system or lose data. This property ensures graceful degradation.

### Property 5: Unit Normalization Consistency

*For any* unit string from the normalization map (mealy, session, pouch, etc.), normalizing it should produce the canonical form, and normalizing the canonical form should be idempotent (normalizing twice = normalizing once).

**Validates: Requirements 4.2**

**Rationale**: Unit normalization must be consistent and idempotent to avoid data corruption.

### Property 6: Temporal Boundary Enforcement

*For any* date D, generating DailyContext should only query habit_entries WHERE date < D (strictly less than), never WHERE date = D.

**Validates: Requirements 5.1, 8.1, 8.6**

**Rationale**: This is the most critical property. Violating temporal boundaries would break determinism and create circular dependencies.

### Property 7: Trailing Window Fallback

*For any* date D where yesterday (D-1) has zero habit entries, DailyContext should fall back to trailing window medians for duration_priors, and reliability scores should reflect the fallback (< 0.5).

**Validates: Requirements 5.13**

**Rationale**: The system must handle missing data gracefully without failing or returning nonsensical values.

### Property 8: Aggregation Completeness

*For any* set of habit entries for a user and date, the Context_Aggregator should produce a DailyContext with all required fields populated (substances, meds, hygiene, meals, day_flags, duration_priors), even if some fields have default values.

**Validates: Requirements 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10**

**Rationale**: DailyContext must always be complete. Missing fields would cause Chain View to crash or behave incorrectly.

### Property 9: Reliability Score Bounds

*For any* category in DailyContext, the reliability score should be in the range [0.0, 1.0], and should increase monotonically with more recent, complete, and consistent data.

**Validates: Requirements 5.14, 6.8**

**Rationale**: Reliability scores are used for decision-making. Out-of-bounds or non-monotonic scores would lead to incorrect behavior.

### Property 10: Cache Invalidation Consistency

*For any* new habit_entry or wake_event, the /api/context/today cache should be invalidated immediately, and the next request should generate fresh DailyContext.

**Validates: Requirements 6.4, 6.5**

**Rationale**: Stale cache would cause Chain View to use outdated data, leading to incorrect suggestions and step injection.

### Property 11: Chain Generation Determinism

*For any* date D and user, generating a chain at time T1 and time T2 (both during day D) should produce identical chains, except for wake_events which may differ if recorded between T1 and T2.

**Validates: Requirements 8.5**

**Rationale**: Determinism is essential for predictability. Users should see the same chain regardless of when they view it (except for wake_events).

### Property 12: Step Injection Correctness

*For any* DailyContext where meds.taken = false and meds.reliability > 0.5, Chain View should inject a "Take meds" step into the morning routine with duration_estimate = 2 minutes.

**Validates: Requirements 7.2**

**Rationale**: Step injection is a key feature. Missing or incorrect injection would reduce the value of the feature.

### Property 13: Duration Prior Application

*For any* chain step with a matching duration prior in DailyContext, the step's duration_estimate should be adjusted to use the prior value (median from trailing window) instead of the template default.

**Validates: Requirements 7.3**

**Rationale**: Duration priors make chains realistic. Not applying them would result in inaccurate timing.

### Property 14: Risk Inflator Application

*For any* chain with day_flags.low_energy_risk = true, the total chain duration should be inflated by 10%, and with day_flags.sleep_debt_risk = true, inflated by 15% (cumulative if both).

**Validates: Requirements 7.4**

**Rationale**: Risk inflators account for degraded performance. Not applying them would lead to overly optimistic timing.

### Property 15: Source Tracking Completeness

*For any* habit entry created through any path (import, manual logging, macro), the source field should be set to one of: 'loop_root', 'loop_per_habit', 'manual', 'macro', never NULL.

**Validates: Requirements 2.6**

**Rationale**: Source tracking is essential for debugging and analytics. Missing source would make it impossible to trace data origin.


## Error Handling

### Import Errors

**File Validation Errors**:
- Missing required files → Return 400 with clear message
- File size exceeds limit → Return 413 with limit information
- Invalid CSV format → Return 400 with parsing error details
- Encoding issues → Attempt UTF-8 fallback, warn user if data loss

**Data Validation Errors**:
- Invalid date formats → Skip row, log warning, continue import
- Missing required columns → Return 400 before processing
- Duplicate entries → Use conflict resolution strategy
- Invalid numerical values → Skip value, log warning, continue

**Conflict Resolution**:
- Detect conflicts before import
- Present options: merge, replace, skip, rename
- User must resolve all conflicts before proceeding
- Log all conflict resolutions for audit trail

### Parsing Errors

**Notes Parser Failures**:
- Malformed patterns → Return confidence < 0.5, preserve original text
- Ambiguous patterns → Return multiple interpretations with confidence scores
- Unknown patterns → Ignore, preserve original text
- Empty notes → Return empty ParsedNoteData with confidence = 0

**Graceful Degradation**:
- Parser never throws exceptions
- Always returns valid ParsedNoteData object
- Original note text always preserved
- Confidence score reflects parse quality

### Aggregation Errors

**Missing Data Handling**:
- No yesterday data → Fall back to trailing window medians
- No trailing window data → Use system defaults, reliability = 0
- Partial data → Calculate what's possible, mark reliability accordingly
- Corrupted data → Skip corrupted entries, log error, continue

**Wake Events Errors**:
- No wake_events → Use habit-based wake time if available
- Multiple wake_events → Use earliest wake time
- Invalid wake_events → Ignore, fall back to habits
- Future wake_events → Ignore (clock skew protection)

### API Errors

**Authentication Errors**:
- No session → Return 401 Unauthorized
- Expired session → Return 401 with refresh hint
- Invalid user → Return 403 Forbidden

**Cache Errors**:
- Cache unavailable → Generate fresh, log warning
- Cache corruption → Invalidate, generate fresh
- Cache timeout → Generate fresh, log warning

**Database Errors**:
- Connection failure → Return 503 Service Unavailable
- Query timeout → Return 504 Gateway Timeout
- Constraint violation → Return 400 with details

### Chain View Integration Errors

**DailyContext Fetch Errors**:
- API unavailable → Use fallback defaults, show warning
- Timeout → Use cached data if available, else defaults
- Invalid response → Use defaults, log error

**Step Injection Errors**:
- Invalid step definition → Skip injection, log error
- Timing conflict → Adjust timing, log warning
- Missing duration prior → Use template default


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Both are complementary and necessary. Unit tests catch concrete bugs, property tests verify general correctness.

### Unit Testing Focus

Unit tests should focus on:
- Specific examples that demonstrate correct behavior
- Integration points between components
- Edge cases and error conditions
- Schema migrations and database constraints

**Avoid writing too many unit tests** - property-based tests handle covering lots of inputs.

### Property-Based Testing Configuration

**Library Selection**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: habits-v2.1, Property {number}: {property_text}`

**Example**:
```typescript
import fc from 'fast-check';

// Feature: habits-v2.1, Property 1: Loop Value Normalization
test('Loop value normalization is reversible', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1000000 }), (value) => {
      const loopValue = value * 1000;
      const normalized = normalizeLoopValue(loopValue.toString(), 'NUMERICAL');
      expect(normalized).toBe(value);
    }),
    { numRuns: 100 }
  );
});
```

### Critical Test Coverage

**Must-Have Unit Tests**:

1. **normalizeLoopValue Function**:
   - Test division by 1000 for numerical values
   - Test YES/NO/SKIP/UNKNOWN mapping
   - Test edge cases: 0, negative, very large numbers
   - Test invalid inputs: non-numeric strings, null, undefined

2. **Notes Parser**:
   - Test all pattern extraction (strength, count, time, method, type)
   - Test malformed patterns (graceful degradation)
   - Test empty notes
   - Test unicode characters
   - Test very long notes (>10KB)
   - Test notes with special characters

3. **Daily Context Aggregator**:
   - Test temporal boundary (date < D)
   - Test fallback to trailing window
   - Test reliability score calculation
   - Test with zero entries
   - Test with partial data

4. **API Endpoint**:
   - Test authentication (401 for unauthenticated)
   - Test response structure (matches DailyContext interface)
   - Test caching (60s TTL)
   - Test cache invalidation

5. **Schema Migration**:
   - Test columns exist with correct types
   - Test nullable constraints
   - Test indexes created
   - Test backward compatibility

**Must-Have Property Tests**:

1. **Property 1: Loop Value Normalization** (Requirements 1.3)
2. **Property 2: Import Data Preservation** (Requirements 1.2)
3. **Property 3: Parser Pattern Extraction** (Requirements 3.1-3.10)
4. **Property 4: Parser Graceful Degradation** (Requirements 3.11)
5. **Property 5: Unit Normalization Consistency** (Requirements 4.2)
6. **Property 6: Temporal Boundary Enforcement** (Requirements 5.1, 8.1, 8.6)
7. **Property 7: Trailing Window Fallback** (Requirements 5.13)
8. **Property 8: Aggregation Completeness** (Requirements 5.4-5.10)
9. **Property 9: Reliability Score Bounds** (Requirements 5.14, 6.8)
10. **Property 10: Cache Invalidation Consistency** (Requirements 6.4, 6.5)
11. **Property 11: Chain Generation Determinism** (Requirements 8.5)
12. **Property 12: Step Injection Correctness** (Requirements 7.2)
13. **Property 13: Duration Prior Application** (Requirements 7.3)
14. **Property 14: Risk Inflator Application** (Requirements 7.4)
15. **Property 15: Source Tracking Completeness** (Requirements 2.6)

### Integration Testing

**API Integration Test** (minimum one required):
```typescript
test('GET /api/context/today returns valid DailyContext', async () => {
  // Mock database with yesterday's habit entries
  const mockEntries = [
    { habit_id: 'meds', date: yesterday, value: 0 }, // meds not taken
    { habit_id: 'shower', date: yesterday, value: 1, duration_minutes: 10 },
  ];
  
  // Mock wake_events
  const mockWakeEvent = { timestamp: today.setHours(8, 0, 0) };
  
  // Call API
  const response = await fetch('/api/context/today', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  
  // Verify response
  expect(response.status).toBe(200);
  const context = await response.json();
  expect(context).toMatchObject({
    date: expect.any(String),
    wake: expect.objectContaining({ timestamp: expect.any(String) }),
    substances: expect.any(Object),
    meds: expect.objectContaining({ taken: false }),
    hygiene: expect.objectContaining({ shower_done: true }),
    meals: expect.any(Object),
    day_flags: expect.any(Object),
    duration_priors: expect.any(Object),
  });
});
```

### UI Testing

UI components (notes-first logging, habit creation, import preview) should be tested with:
- Component rendering tests (React Testing Library)
- User interaction tests (click, type, select)
- Integration tests with mocked API
- Visual regression tests (optional)

### Performance Testing

**Cache Performance**:
- Verify 60s cache TTL
- Verify cache hit rate > 80% under normal load
- Verify cache invalidation latency < 100ms

**Aggregation Performance**:
- Verify DailyContext generation < 500ms for 1000 entries
- Verify trailing window query < 200ms for 30 days
- Verify parser throughput > 100 notes/second

### Test Data Generators

For property-based testing, create generators for:
- Random habit entries with valid dates, values, notes
- Random notes with various patterns (strength, count, time, etc.)
- Random DailyContext objects with valid structure
- Random Loop Habits CSV data

**Example Generator**:
```typescript
const habitEntryArbitrary = fc.record({
  habit_id: fc.uuid(),
  user_id: fc.uuid(),
  date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  value: fc.integer({ min: 0, max: 2 }),
  notes: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
  numeric_value: fc.option(fc.double({ min: 0, max: 100 })),
});
```

