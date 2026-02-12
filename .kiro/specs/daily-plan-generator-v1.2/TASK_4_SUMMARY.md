# Task 4 Implementation Summary: Wake Time Default Logic

## Overview
Implemented smart wake time defaults for the daily plan generator to prevent users from accidentally generating early morning plans when it's already afternoon.

## Requirements Addressed
- **8.1**: If current time < 12:00, default wake time = 07:00
- **8.2**: If current time >= 12:00, default wake time = now rounded down to nearest 15 min
- **8.3**: Allow user to override the default wake time
- **8.4**: Accept wake time from form and use planStart = max(wakeTime, now)
- **8.5**: Display the calculated default wake time

## Changes Made

### 1. Plan Generation Form (`src/components/daily-plan/PlanGeneratorForm.tsx`)

**Added `calculateDefaultWakeTime()` function:**
```typescript
function calculateDefaultWakeTime(): string {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Requirement 8.1: If current time < 12:00, default to 07:00
  if (currentHour < 12) {
    return '07:00';
  }
  
  // Requirement 8.2: If current time >= 12:00, round down to nearest 15 minutes
  const currentMinute = now.getMinutes();
  const roundedMinute = Math.floor(currentMinute / 15) * 15;
  
  const hours = currentHour.toString().padStart(2, '0');
  const minutes = roundedMinute.toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}
```

**Updated component state:**
- Changed `useState('07:00')` to `useState(() => calculateDefaultWakeTime())`
- Added `useEffect` to calculate default on mount
- User can still override by typing in the time input field (Requirement 8.3)

### 2. API Endpoint (`src/pages/api/daily-plan/generate.ts`)

**Updated documentation:**
- Added Requirement 8.4 reference
- Documented that the plan builder handles `planStart = max(wakeTime, now)` internally
- No code changes needed - API already accepts wake time from form correctly

### 3. Test Script (`scripts/test-wake-time-defaults.ts`)

Created comprehensive test script that validates:
- Morning time (before 12:00) → defaults to 07:00 ✓
- Afternoon time (after 12:00) → rounds down to nearest 15 min ✓
- Exactly at noon → returns 12:00 ✓
- Various times with rounding (14:37 → 14:30, 16:47 → 16:45, 19:08 → 19:00) ✓
- Edge case: 11:59 → still returns 07:00 (morning) ✓

**All tests pass!**

## Behavior Examples

| Current Time | Default Wake Time | Reasoning |
|--------------|-------------------|-----------|
| 09:30 AM | 07:00 | Before noon, use standard morning wake time |
| 11:59 AM | 07:00 | Still before noon |
| 12:00 PM | 12:00 | At or after noon, use current time rounded down |
| 14:37 PM | 14:30 | Rounded down to nearest 15 minutes |
| 16:47 PM | 16:45 | Rounded down to nearest 15 minutes |
| 19:08 PM | 19:00 | Rounded down to nearest 15 minutes |

## User Experience Improvements

**Before:**
- Wake time always defaulted to 07:00
- Users generating plans at 2pm would see 07:00 and might not notice
- Could accidentally generate a full-day plan when they only need afternoon/evening

**After:**
- Morning users (before noon): Still get 07:00 default (normal morning wake time)
- Afternoon users (after noon): Get current time rounded down (realistic for late generation)
- Users can always override if they want to plan ahead for tomorrow

## Integration with Existing System

The plan builder already handles the `planStart = max(wakeTime, now)` logic:
```typescript
const planStartTime = new Date(Math.max(input.wakeTime.getTime(), roundedNow.getTime()));
```

This means:
- If user sets wake time to 07:00 but generates at 14:00, plan starts at 14:00
- If user sets wake time to 14:30 and generates at 14:00, plan starts at 14:30
- The system is smart about not scheduling activities in the past

## Testing

Run the test script:
```bash
npx tsx scripts/test-wake-time-defaults.ts
```

All 6 test cases pass, validating:
- Morning default (< 12:00)
- Afternoon rounding (>= 12:00)
- Edge cases (exactly noon, just before noon)
- Various rounding scenarios

## Status
✅ Task 4.1 Complete - Form updated with smart defaults
✅ Task 4.2 Complete - API endpoint documented (already working correctly)
✅ All tests passing
✅ No TypeScript errors
