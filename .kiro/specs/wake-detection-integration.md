Here's a concise, structured, and AI-agent-friendly documentation summary of what we've built so far.  
You can copy-paste this directly into your notes, a spec file (e.g. `wake-detection-integration.md`), or feed it to another agent when you're ready to wire this into the chain-based plan builder.

```markdown
# Wake-Up Detection Integration – MacroDroid → Supabase Edge Function

## Purpose
Capture the user's first proper phone unlock after sunrise each day (wake-up signal) and reliably send it to the backend so the daily plan generator can use the actual wake timestamp (instead of defaults or assumptions).  
Later extensions: include battery % for low-battery-aware scheduling.

## Components

1. MacroDroid (Android automation app)
   - Macro name: "Wakey"
   - Trigger: Device Unlocked
   - Constraint: After sunrise (location-based, Wigston Magna)
   - Logic (inside If block):
     - If global boolean variable "Unlocked" === true
       - Add calendar event: "Wakey / woke up probably" (visible confirmation)
       - Send HTTP POST to Supabase edge function
       - Set "Unlocked" = false (prevents duplicates same day)
   - Reset macro: "Wakey Reset"
     - Trigger: Every day at 04:00
     - Action: Set "Unlocked" = true
   - HTTP POST body (JSON):
     ```json
     {
       "wake_time": "%TIME_MS%",
       "date":      "%DATE%",
       "user_id":   "70429eba-f32e-47ab-bfcb-a75e2f819de4",
       "battery":   "%BATTERY%",
       "device":    "%DEVICE_NAME%"
     }
     ```
   - Headers:
     - x-webhook-secret: <your-secret-value> (e.g. "hello")
   - Status: Working – fires once per day, sends valid payload

2. Supabase Edge Function
   - Name: wake-trigger
   - URL: https://mdhtpjpwwbuepsytgrva.supabase.co/functions/v1/wake-trigger
   - Deployed with: --no-verify-jwt
   - Protection: Custom header check (x-webhook-secret)
   - Environment variables:
     - WEBHOOK_SECRET = <your-secret-value>
     - SUPABASE_URL
     - SUPABASE_SERVICE_ROLE_KEY
   - Behavior:
     - Validates secret
     - Parses JSON body
     - Converts wake_time (ms string → ISO timestamptz)
     - Inserts into table wake_events
     - Returns 200 with inserted row info on success
   - Current return example:
     ```json
     {
       "success": true,
       "inserted": {
         "id": "350d9d82-7bba-441a-bb30-1dca3c13ebdb",
         "wake_timestamp": "2026-01-31T22:03:49.463+00:00",
         "wake_date": "2026-01-31",
         "battery_percentage": 58
       }
     }
     ```

3. Supabase Table: wake_events
   Schema (relevant columns):
   - id                  uuid          PK
   - user_id             uuid          nullable
   - wake_timestamp      timestamptz
   - wake_date           date
   - source              text          (currently "macrodroid")
   - payload             jsonb         nullable
   - battery_percentage  integer       nullable (added later)
   - created_at          timestamptz   auto-filled

   Example row after successful insert:
   ```json
   {
     "id": "350d9d82-7bba-441a-bb30-1dca3c13ebdb",
     "user_id": "70429eba-f32e-47ab-bfcb-a75e2f819de4",
     "wake_timestamp": "2026-01-31T22:03:49.463+00:00",
     "wake_date": "2026-01-31",
     "source": "macrodroid",
     "payload": null,
     "battery_percentage": 58,
     "created_at": "2026-01-31T22:03:02.092751+00:00"
   }
   ```

## Integration Points for Plan Builder / Chain Execution

When ready to connect:

1. Query latest wake event (in plan generation chain step):
   ```sql
   SELECT wake_timestamp, battery_percentage
   FROM wake_events
   WHERE user_id = :userId
   ORDER BY wake_timestamp DESC
   LIMIT 1;
   ```

2. Use cases in planning logic:
   - Anchor schedule start time to wake_timestamp (instead of midnight or default)
   - If battery_percentage < 40–50%: Insert early "Charge phone" block
     - Priority: high
     - Duration: 15–30 min
     - Before any travel/outdoor blocks
   - Pass wake time + battery to Gemini prompt or rule engine:
     "User woke at {wake_timestamp} with {battery_percentage}% battery. Adjust energy allocation and add charging reminder if low."

3. Optional enhancements (future):
   - Realtime subscription on wake_events table → trigger plan regeneration immediately on insert
   - Duplicate prevention: check if wake_timestamp within last 30 min → ignore
   - Add more fields: %BATTERY_TEMP%, %IS_CHARGING%, %SCREEN_BRIGHTNESS%

Status (2026-01-31): Fully functional end-to-end.  
MacroDroid → Edge Function → DB insert confirmed with battery % included.
```

You can now park this doc and come back to it later when you're ready to integrate into the chain.  
When you do, just query the latest row from `wake_events` by `user_id` and `wake_timestamp DESC` — that's your ground-truth wake signal.

Let me know when you're ready to pick this back up (e.g. realtime listener, plan rule for low battery, or migration script for historical data).  
For now — enjoy the win :)