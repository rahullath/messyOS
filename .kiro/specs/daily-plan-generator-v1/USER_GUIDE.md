# Daily Plan Generator V1 - User Guide

## Quick Start

### 1. Access the Daily Plan Page

Navigate to: `http://localhost:4321/daily-plan`

Or click "Daily Plan" in the dashboard sidebar.

### 2. Generate Your First Plan

If no plan exists for today, you'll see a form:

1. **Wake Time**: Set when you want to start your day (default: 07:00)
2. **Sleep Time**: Set when you want to end your day (default: 23:00)
3. **Energy Level**: Choose your energy state:
   - **Low**: Gets 1 task
   - **Medium**: Gets 2 tasks
   - **High**: Gets 3 tasks
4. Click **"Generate Plan"**

### 3. Follow Your Plan

Once generated, you'll see:

- **Current Activity** (highlighted) - what you should be doing now
- **Next Activities** - what's coming up
- **Complete/Skip buttons** - mark activities as done or skipped
- **Exit Times** (if you have calendar commitments with locations)

### 4. Using the Features

#### Mark Activity Complete
- Click "Complete" button on current activity
- Sequence automatically advances to next activity

#### Skip Activity
- Click "Skip" button
- Optionally add a reason
- Sequence advances to next activity

#### Degrade Plan (when behind schedule)
- If you're running 30+ minutes behind
- Click "Degrade Plan" button
- Keeps: commitments, routines, meals
- Drops: optional tasks
- Recomputes all buffers

#### Delete Plan (NEW!)
- Click "🗑️ Delete Today's Plan" button (top right)
- Confirm deletion
- Returns to generation form
- Useful for testing or starting fresh

## What Gets Included in Your Plan

The system automatically pulls in:

✅ **Calendar Events** - Fixed commitments from your calendar  
✅ **Pending Tasks** - Up to 1-3 tasks based on energy level  
✅ **Routines** - Morning (30min) and Evening (20min) routines  
✅ **Meals** - Breakfast (15min), Lunch (30min), Dinner (45min)  
✅ **Buffers** - 5-minute transitions between activities  
✅ **Travel Blocks** - Calculated using real travel data (if locations exist)

## Example Daily Flow

```
07:00 - 07:30  Morning Routine
07:30 - 07:35  Transition
07:35 - 07:50  Breakfast
07:50 - 07:55  Transition
07:55 - 08:55  Task: Complete project documentation
08:55 - 09:00  Transition
09:00 - 09:30  Lunch
...and so on
```

## Tips for Best Results

1. **Add Calendar Events** - The planner schedules around your commitments
2. **Add Tasks** - Create tasks in your task system for the planner to include
3. **Set Realistic Energy** - Be honest about your energy level
4. **Use Degradation** - Don't be afraid to simplify when behind
5. **Check Exit Times** - If you have commitments with locations, watch for when to leave
6. **Delete & Regenerate** - Use the delete button to test different settings

## Limitations (V1 Spine)

This is the minimal viable version. The following are NOT included:

- ❌ Edit plan after generation
- ❌ Add/remove activities mid-day
- ❌ Reorder activities
- ❌ Countdown timers/notifications
- ❌ Timeline visualization
- ❌ Plan history/analytics
- ❌ Weather alerts
- ❌ Automatic meal suggestions
- ❌ Rich UI polish

These features are planned for V2.

## Troubleshooting

### "No plan exists for today"
- This is normal if you haven't generated a plan yet
- Click the form and generate one

### "Plan already exists"
- You can only have one plan per day
- Use the "Delete Today's Plan" button to start fresh
- Or wait until tomorrow

### Test Scripts Creating Plans
- Don't run `test-daily-plan-simple.ts` for normal use
- That's for automated testing only
- Use the web UI at `/daily-plan` instead

### Want to Test Different Settings
- Click "Delete Today's Plan"
- Confirm deletion
- Generate a new plan with different wake/sleep/energy settings

## For Developers

### Test Scripts (Don't Use for Daily Planning)
- `test-daily-plan-simple.ts` - Core loop verification
- `test-e2e-daily-plan.ts` - Full user journey test
- `test-e2e-persistence.ts` - Database persistence test
- `test-v5-integrations-simple.ts` - V5 service integration test

These are for automated testing, not for your actual daily planning.

### API Endpoints
- `POST /api/daily-plan/generate` - Generate new plan
- `GET /api/daily-plan/today` - Fetch today's plan
- `PATCH /api/daily-plan/:id/activity/:activityId` - Update activity status
- `POST /api/daily-plan/:id/degrade` - Degrade plan
- `DELETE /api/daily-plan/:id/delete` - Delete plan (NEW!)

## What's Next?

This is V1 - the thin spine that prevents day collapse. V2 will add:
- Rich timeline visualization
- Countdown notifications
- Plan history and analytics
- Weather integration
- And much more!

For now, focus on using the core loop:
**Generate → Follow → Complete/Skip → Degrade (if needed)**
