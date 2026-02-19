# Resume Prompts (Copy/Paste)

## Prompt: Resume Task N Only
"Use `.codex/00-guardrails.md`, `.codex/01-current-state-map.md`, and `.codex/0N-*.md` for Task N. Stay append-only, minimal diffs, and preserve v1.2 plan-builder behavior. Produce a file-touch plan first, then implement with regression checks from `.codex/09-regression-suite.md`."

## Prompt: Guardrails Audit Before Edits
"Before making edits, run a guardrails audit against `.codex/00-guardrails.md`. List any potential violations and how you will avoid them. Then proceed with minimal-file implementation."

## Prompt: Stop If Stop-Condition Hit
"Implement this task, but if any stop-condition in `.codex/00-guardrails.md` is triggered, stop immediately and report blockers with exact files and conflicting sources of truth."

## Required Context Bundle for New Chat
Include these in the first message:
- target task number and objective
- branch name + latest commit hash
- files already changed (if any)
- failing/passing tests currently known
- relevant `.codex` files (at minimum `00`, `01`, `02`, task file, `09`)

## Fast Resume Checklist
1. Read guardrails.
2. Confirm in/out scope.
3. Confirm minimal files to touch.
4. Confirm regression targets.
5. Implement and report with diff template.
