# Daily Plan Generator V2 - API Documentation

## Overview

V2 introduces chain-based execution semantics on top of V1.2's timeline system. This document describes the API endpoints for chain generation and the modified daily plan generation response.

## Endpoints

### GET /api/chains/today

Returns execution chains for today based on calendar anchors.

**Purpose**: Fetch chains independently of the full daily plan. Useful for displaying chain view without generating a complete timeline.

**Authentication**: Required (user session)

**Request**:
```http
GET /api/chains/today
Authorization: Bearer <session_token>
```

**Query Parameters**: None (uses current date and authenticated user)

**Response**: `200 OK`

```typescript
interface ChainsResponse {
  date: string;                    // ISO date string (YYYY-MM-DD)
  anchors: Anchor[];               // Calendar events classified as anchors
  chains: ExecutionChain[];        // Generated execution chains
  home_intervals: HomeInterval[];  // Time periods when user is at home
  wake_ramp?: WakeRamp;           // Wake-up ramp (if not skipped)
}

interface Anchor {
  id: string;
  start: Date;
  end: Date;
  title: string;
  location?: string;
  type: 'class' | 'seminar' | 'workshop' | 'appointment' | 'other';
  must_attend: boolean;
  calendar_event_id: string;
}

interface ExecutionChain {
  chain_id: string;
  anchor_id: string;
  anchor: Anchor;
  chain_completion_deadline: Date;  // Time by which chain must complete
  steps: ChainStepInstance[];
  commitment_envelope: CommitmentEnvelope;
}

interface ChainStepInstance {
  step_id: string;
  chain_id: string;
  name: string;
  start_time: Date;
  end_time: Date;
  duration: number;                 // minutes
  is_required: boolean;
  can_skip_when_late: boolean;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  role: 'chain-step' | 'exit-gate' | 'recovery' | 'anchor';
}

interface CommitmentEnvelope {
  prep: ChainStepInstance;
  travel_there: ChainStepInstance;
  anchor: ChainStepInstance;
  travel_back: ChainStepInstance;
  recovery: ChainStepInstance;
}

interface HomeInterval {
  start: Date;
  end: Date;
  duration: number;  // minutes
}

interface WakeRamp {
  start: Date;
  end: Date;
  duration: number;  // minutes
  components: {
    toilet: number;
    hygiene: number;
    shower: number;
    dress: number;
    buffer: number;
  };
  skipped: boolean;
  skip_reason?: string;
}
```

**Example Response**:

```json
{
  "date": "2025-02-01",
  "anchors": [
    {
      "id": "anchor-1",
      "start": "2025-02-01T14:00:00Z",
      "end": "2025-02-01T16:00:00Z",
      "title": "Computer Science Lecture",
      "location": "Room 301, Engineering Building",
      "type": "class",
      "must_attend": true,
      "calendar_event_id": "cal-event-123"
    }
  ],
  "chains": [
    {
      "chain_id": "chain-1",
      "anchor_id": "anchor-1",
      "anchor": { /* anchor object */ },
      "chain_completion_deadline": "2025-02-01T13:15:00Z",
      "steps": [
        {
          "step_id": "feed-cat",
          "chain_id": "chain-1",
          "name": "Feed cat",
          "start_time": "2025-02-01T12:00:00Z",
          "end_time": "2025-02-01T12:05:00Z",
          "duration": 5,
          "is_required": true,
          "can_skip_when_late": false,
          "status": "pending",
          "role": "chain-step"
        },
        {
          "step_id": "bathroom",
          "chain_id": "chain-1",
          "name": "Bathroom",
          "start_time": "2025-02-01T12:05:00Z",
          "end_time": "2025-02-01T12:15:00Z",
          "duration": 10,
          "is_required": true,
          "can_skip_when_late": false,
          "status": "pending",
          "role": "chain-step"
        }
        // ... more steps
      ],
      "commitment_envelope": {
        "prep": { /* prep step */ },
        "travel_there": { /* travel step */ },
        "anchor": { /* anchor step */ },
        "travel_back": { /* travel step */ },
        "recovery": { /* recovery step */ }
      }
    }
  ],
  "home_intervals": [
    {
      "start": "2025-02-01T08:00:00Z",
      "end": "2025-02-01T12:30:00Z",
      "duration": 270
    },
    {
      "start": "2025-02-01T17:00:00Z",
      "end": "2025-02-01T23:00:00Z",
      "duration": 360
    }
  ],
  "wake_ramp": {
    "start": "2025-02-01T08:00:00Z",
    "end": "2025-02-01T09:15:00Z",
    "duration": 75,
    "components": {
      "toilet": 20,
      "hygiene": 10,
      "shower": 25,
      "dress": 20,
      "buffer": 0
    },
    "skipped": false
  }
}
```

**Error Responses**:

- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Calendar service failure or chain generation error

**Error Response Example**:

```json
{
  "error": "Calendar service unavailable",
  "message": "Unable to fetch calendar events. Returning empty anchors.",
  "anchors": [],
  "chains": [],
  "home_intervals": [],
  "wake_ramp": null
}
```

---

### POST /api/daily-plan/generate

Generates a complete daily plan including chains, timeline, and meals.

**Changes in V2**: Response now includes `chains`, `home_intervals`, `wake_ramp`, and `location_periods` alongside the existing timeline.

**Authentication**: Required (user session)

**Request**:
```http
POST /api/daily-plan/generate
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "date": "2025-02-01",
  "preferences": {
    "meal_scaffolding": false,  // Optional: default false (0-1 meals)
    "energy_level": "medium"    // Optional: low | medium | high
  }
}
```

**Request Body**:

```typescript
interface GeneratePlanRequest {
  date: string;  // ISO date string (YYYY-MM-DD)
  preferences?: {
    meal_scaffolding?: boolean;  // Default: false
    energy_level?: 'low' | 'medium' | 'high';  // Default: 'medium'
  };
}
```

**Response**: `200 OK`

```typescript
interface DailyPlanResponse {
  // Existing V1.2 fields
  plan_id: string;
  date: string;
  user_id: string;
  time_blocks: TimeBlock[];
  
  // New V2 fields
  chains: ExecutionChain[];
  home_intervals: HomeInterval[];
  wake_ramp?: WakeRamp;
  location_periods: LocationPeriod[];
  
  // Metadata
  created_at: string;
  updated_at: string;
}

interface TimeBlock {
  id: string;
  type: 'wake-ramp' | 'meal' | 'task' | 'class' | 'travel' | 'buffer' | 'chain-step' | 'exit-gate' | 'recovery';
  title: string;
  start_time: string;
  end_time: string;
  duration: number;  // minutes
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  metadata: TimeBlockMetadata;
}

interface TimeBlockMetadata {
  // V1.2 fields
  target_time?: string;
  placement_reason?: string;
  skip_reason?: string;
  
  // V2 fields
  role?: {
    type: 'anchor' | 'chain-step' | 'exit-gate' | 'recovery';
    required: boolean;
    chain_id?: string;
    gate_conditions?: GateCondition[];
  };
  chain_id?: string;
  step_id?: string;
  anchor_id?: string;
  location_state?: 'at_home' | 'not_home';
  commitment_envelope?: {
    envelope_id: string;
    envelope_type: 'prep' | 'travel_there' | 'anchor' | 'travel_back' | 'recovery';
  };
}

interface LocationPeriod {
  start: Date;
  end: Date;
  state: 'at_home' | 'not_home';
}
```

**Example Response**:

```json
{
  "plan_id": "plan-abc123",
  "date": "2025-02-01",
  "user_id": "user-xyz789",
  "time_blocks": [
    {
      "id": "block-1",
      "type": "wake-ramp",
      "title": "Wake Ramp",
      "start_time": "2025-02-01T08:00:00Z",
      "end_time": "2025-02-01T09:15:00Z",
      "duration": 75,
      "status": "pending",
      "metadata": {
        "location_state": "at_home"
      }
    },
    {
      "id": "block-2",
      "type": "chain-step",
      "title": "Feed cat",
      "start_time": "2025-02-01T12:00:00Z",
      "end_time": "2025-02-01T12:05:00Z",
      "duration": 5,
      "status": "pending",
      "metadata": {
        "role": {
          "type": "chain-step",
          "required": true,
          "chain_id": "chain-1"
        },
        "chain_id": "chain-1",
        "step_id": "feed-cat",
        "anchor_id": "anchor-1",
        "location_state": "at_home"
      }
    },
    {
      "id": "block-3",
      "type": "meal",
      "title": "Lunch",
      "start_time": "2025-02-01T11:30:00Z",
      "end_time": "2025-02-01T12:00:00Z",
      "duration": 30,
      "status": "pending",
      "metadata": {
        "target_time": "12:00",
        "placement_reason": "Placed in home interval before chain",
        "location_state": "at_home"
      }
    }
    // ... more blocks
  ],
  "chains": [
    {
      "chain_id": "chain-1",
      "anchor_id": "anchor-1",
      "anchor": { /* anchor object */ },
      "chain_completion_deadline": "2025-02-01T13:15:00Z",
      "steps": [ /* chain steps */ ],
      "commitment_envelope": { /* envelope */ }
    }
  ],
  "home_intervals": [
    {
      "start": "2025-02-01T08:00:00Z",
      "end": "2025-02-01T12:30:00Z",
      "duration": 270
    }
  ],
  "wake_ramp": {
    "start": "2025-02-01T08:00:00Z",
    "end": "2025-02-01T09:15:00Z",
    "duration": 75,
    "components": {
      "toilet": 20,
      "hygiene": 10,
      "shower": 25,
      "dress": 20,
      "buffer": 0
    },
    "skipped": false
  },
  "location_periods": [
    {
      "start": "2025-02-01T08:00:00Z",
      "end": "2025-02-01T12:30:00Z",
      "state": "at_home"
    },
    {
      "start": "2025-02-01T12:30:00Z",
      "end": "2025-02-01T17:00:00Z",
      "state": "not_home"
    },
    {
      "start": "2025-02-01T17:00:00Z",
      "end": "2025-02-01T23:00:00Z",
      "state": "at_home"
    }
  ],
  "created_at": "2025-02-01T07:00:00Z",
  "updated_at": "2025-02-01T07:00:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid date format or preferences
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Plan generation failure

---

## Usage Examples

### Example 1: Fetch chains for today

```typescript
// Fetch chains independently
const response = await fetch('/api/chains/today', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
});

const data: ChainsResponse = await response.json();

// Display chain view
data.chains.forEach(chain => {
  console.log(`Next anchor: ${chain.anchor.title}`);
  console.log(`Complete chain by: ${chain.chain_completion_deadline}`);
  console.log(`Steps: ${chain.steps.length}`);
});
```

### Example 2: Generate full daily plan with chains

```typescript
// Generate complete plan
const response = await fetch('/api/daily-plan/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: '2025-02-01',
    preferences: {
      meal_scaffolding: false,
      energy_level: 'medium'
    }
  })
});

const plan: DailyPlanResponse = await response.json();

// Access chains
console.log(`Generated ${plan.chains.length} chains`);

// Access timeline
console.log(`Generated ${plan.time_blocks.length} time blocks`);

// Access home intervals
console.log(`Home intervals: ${plan.home_intervals.length}`);
```

### Example 3: Handle calendar service failure

```typescript
const response = await fetch('/api/chains/today');
const data = await response.json();

if (data.error) {
  console.warn('Calendar service unavailable:', data.message);
  // Display basic plan without anchors
  displayBasicPlan();
} else {
  // Display chains
  displayChains(data.chains);
}
```

---

## Migration Notes

### V1.2 → V2 Compatibility

**Backward Compatible**: V1.2 clients can continue using the `/api/daily-plan/generate` endpoint. The response includes all V1.2 fields plus new V2 fields.

**V1.2 Response** (still supported):
```json
{
  "plan_id": "...",
  "date": "...",
  "time_blocks": [...]
}
```

**V2 Response** (enhanced):
```json
{
  "plan_id": "...",
  "date": "...",
  "time_blocks": [...],
  "chains": [...],        // NEW
  "home_intervals": [...], // NEW
  "wake_ramp": {...},     // NEW
  "location_periods": [...] // NEW
}
```

**Client Migration**:
1. Update client to handle new fields
2. Use `chains` for chain view UI
3. Use `time_blocks` for timeline view UI
4. Prioritize chain view over timeline view

---

## Error Handling

### Calendar Service Failures

When the calendar service is unavailable:
- Endpoint returns `200 OK` with empty `anchors` array
- `chains` array is empty
- `home_intervals` includes full day (planStart to sleepTime)
- Plan generation continues with basic structure (Wake Ramp + meals + tasks)

**Client Handling**:
```typescript
if (data.anchors.length === 0 && data.chains.length === 0) {
  displayMessage('No calendar access. Showing basic plan.');
}
```

### Travel Service Failures

When travel duration cannot be calculated:
- Uses fallback duration: 30 minutes
- Travel block includes `metadata.fallback_used = true`
- Warning logged for debugging

**Client Handling**:
```typescript
const travelBlock = plan.time_blocks.find(b => b.type === 'travel');
if (travelBlock?.metadata?.fallback_used) {
  displayWarning('Travel time estimated (service unavailable)');
}
```

### Chain Generation Failures

When chain template is missing:
- Uses default template (class template)
- Chain includes `metadata.template_fallback = true`
- Warning logged with anchor type

**Client Handling**:
```typescript
const chain = data.chains[0];
if (chain.metadata?.template_fallback) {
  console.warn('Using default chain template');
}
```

---

## Rate Limiting

Both endpoints respect standard rate limits:
- 100 requests per minute per user
- 1000 requests per hour per user

Exceeding limits returns `429 Too Many Requests`.

---

## Validation: Requirements 19.1, 19.2

This documentation covers:
- ✅ GET /api/chains/today endpoint structure and response
- ✅ POST /api/daily-plan/generate modified response with V2 fields
- ✅ Example requests and responses for both endpoints
- ✅ Error handling scenarios
- ✅ Migration guidance for V1.2 → V2
