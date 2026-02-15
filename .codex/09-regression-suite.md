# Regression Suite (Must Pass After Each Task)

## Mandatory Regressions
1. Chain generation still surfaces:
- Next Anchor
- "Complete by"
- Exit times box behavior unchanged

2. Habits import integrity:
- re-import does not create duplicates
- per-habit notes preserved

3. Auth baseline:
- existing user login works
- new user signup lands in empty dashboard

4. RLS isolation:
- User A cannot read User B `habit_entries`
- User A cannot read User B `time_blocks`
- User A cannot read User B `daily_plans`

## Recommended Command Placeholders
- Full/target test run:
```bash
# replace with actual command for current task scope
npx vitest --run <target-tests>
```

- Existing habits v2.1 checkpoint (if relevant):
```bash
npx vitest --run src/test/e2e/habits-v2-1-final-checkpoint.test.tsx
```

## Evidence Capture Format
For each executed task, store a short block in PR/update notes:
- Task ID:
- Date/time:
- Commands run:
- Pass/fail summary:
- Any skipped tests and rationale:
- Regression deltas observed:

## Failure Policy
If a mandatory regression fails:
1. Stop forward implementation.
2. Capture failing test and diff context.
3. Fix regression before continuing task sequence.
