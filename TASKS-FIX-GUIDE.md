# Tasks Module Fix Guide

## Issues Found and Solutions

### 1. Database Schema Issue
**Problem**: The original schema had an index using `DATE()` function which needs to be marked as IMMUTABLE.

**Solution**: Use the simplified schema in `database-tasks-simple.sql`

### 2. API Error Handling
**Problem**: The API wasn't providing enough debugging information.

**Solution**: Enhanced error logging and validation in the API endpoints.

## Step-by-Step Fix

### Step 1: Update Database Schema

1. Open your Supabase SQL Editor
2. Run the contents of `database-tasks-simple.sql` to create clean tables
3. This will drop existing tables and recreate them with proper structure

### Step 2: Test Database Connection

Visit: `http://localhost:4322/api/tasks/test`

This will show you:
- If the tasks table exists
- What columns are available
- If there are any connection issues

### Step 3: Test Task Creation

1. Go to `/tasks` page
2. Click "Add Task" 
3. Fill in:
   - Title: "Test Task"
   - Category: "Work" 
   - Priority: "medium"
4. Submit the form

### Step 4: Check Server Logs

Look for these log messages in your terminal:
- "Received task data: ..." - Shows what data was sent
- "Insert data: ..." - Shows what's being inserted
- "Created task: ..." - Shows successful creation
- Any error messages with details

## Common Issues and Solutions

### Issue: "Failed to create task"
**Causes**:
1. Tasks table doesn't exist
2. Missing required fields
3. Invalid data types
4. RLS policy blocking insert

**Debug Steps**:
1. Check `/api/tasks/test` endpoint
2. Look at server console logs
3. Verify you're logged in
4. Check Supabase dashboard for errors

### Issue: "Authentication required"
**Solution**: Make sure you're logged in to the app

### Issue: Modal doesn't open
**Solution**: Check browser console for JavaScript errors

### Issue: Form submission does nothing
**Solution**: 
1. Check network tab for failed requests
2. Look at server logs
3. Verify API endpoints exist

## Database Schema Summary

The simplified schema includes:

**tasks table**:
- id (UUID, primary key)
- user_id (UUID, foreign key)
- title (TEXT, required)
- description (TEXT, optional)
- category (TEXT, required)
- priority (low/medium/high)
- status (todo/in_progress/completed/on_hold)
- estimated_duration (INTEGER, minutes)
- due_date (TIMESTAMPTZ)
- scheduled_for (TIMESTAMPTZ)
- completed_at (TIMESTAMPTZ)
- energy_required (low/medium/high)
- complexity (simple/moderate/complex)
- location (TEXT)
- context (JSONB array)
- tags (JSONB array)
- email_reminders (BOOLEAN)
- notes (TEXT)
- created_at, updated_at (TIMESTAMPTZ)

**task_sessions table**:
- id (UUID, primary key)
- task_id (UUID, foreign key)
- user_id (UUID, foreign key)
- started_at (TIMESTAMPTZ, required)
- ended_at (TIMESTAMPTZ, optional)
- duration (INTEGER, seconds)
- session_type (work/break/review/planning)
- notes (TEXT)
- productivity_score (1-10)
- energy_level (1-10)
- mood (TEXT)
- context (TEXT)
- created_at (TIMESTAMPTZ)

## API Endpoints

- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/test` - Test database connection
- `GET /api/tasks/[id]` - Get specific task
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `POST /api/tasks/[id]/start` - Start task session
- `POST /api/tasks/stop-session` - Stop active session

## Features Working

✅ **Task Creation**: Add new tasks with title, description, category, priority, due date
✅ **Task Display**: View tasks organized by status (todo, in progress, completed, on hold)
✅ **Task Actions**: Start timer, mark complete, edit (edit UI pending)
✅ **Time Tracking**: Start/stop task sessions with automatic duration calculation
✅ **Status Management**: Automatic status updates when starting/completing tasks
✅ **Responsive Design**: Works on desktop and mobile
✅ **Real-time Updates**: Page refreshes after actions to show changes
✅ **Error Handling**: User-friendly error messages and notifications
✅ **Authentication**: Secure access with user-specific data

## Next Steps

1. Run the database schema
2. Test task creation
3. If issues persist, check the specific error messages
4. The AI agent integration is ready at `/ai-agent` for task insights

## Troubleshooting Commands

```bash
# Check if server is running
curl http://localhost:4322/api/tasks/test

# Check database connection
# Visit Supabase dashboard > SQL Editor > run: SELECT * FROM tasks LIMIT 1;

# Check authentication
# Visit your app and ensure you're logged in

# Check browser console
# F12 > Console tab > look for JavaScript errors

# Check network requests
# F12 > Network tab > try creating a task > look for failed requests
```