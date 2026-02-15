# Codex Stabilization Dossier (V2.2)

## Purpose
This folder is a resumable implementation dossier for **V2.2 Stabilization + Shareable PWA**. It is designed to prevent regressions, enforce append-only execution, and preserve working behavior while shipping the next set of improvements.

This is **documentation scaffolding only**. Runtime behavior is unchanged by these files.

## Start Here
1. Read `.codex/00-guardrails.md` completely.
2. Read `.codex/01-current-state-map.md` to ground in repo reality.
3. Pick the next task from `.codex/02-task-order.md`.
4. Open the matching task dossier (`03` to `08`, optional `07` and meal notes in task order).
5. Run/plan regression checks from `.codex/09-regression-suite.md`.
6. Report changes using `.codex/11-diff-summary-template.md`.

## Working Rules
- Plan mode first for non-trivial changes.
- Minimal diffs only; avoid broad refactors.
- Preserve existing plan-builder v1.2 and meal placement logic unless explicitly required.
- Additive schema only; no drops/renames.
- Keep file/module placement consistent with existing architecture.

## Folder Map
- `00-guardrails.md`: hard boundaries and stop conditions
- `01-current-state-map.md`: known implementation map + gaps
- `02-task-order.md`: canonical execution sequence and done criteria
- `03-task-1-chain-completion.md`: step completion execution layer
- `04-task-2-exit-gate.md`: gate persistence + eyeglasses
- `05-task-3-shower-decider.md`: deterministic shower mode logic
- `06-task-4-calendar-classifier.md`: travel/local/soft classification
- `07-task-5-security-rls.md`: multi-user hardening + RLS checks
- `08-task-6-mobile-baseline.md`: core mobile/PWA baseline constraints
- `09-regression-suite.md`: must-pass regressions and evidence format
- `10-resume-prompts.md`: copy-paste resume prompts for future chats
- `11-diff-summary-template.md`: standard reporting template

## Planned Interface Contracts (Documentation)
- Planned endpoints:
  - `POST /api/time-blocks/:id/complete`
  - `POST /api/time-blocks/:id/uncomplete`
  - `POST /api/time-blocks/:id/update-meta`
- Planned `TimeBlockMetadata` additions:
  - `completed_at`, `completed_by`
  - `role.anchor_kind` (`travel | local | soft`) where relevant
  - `gate_conditions` persistence semantics
  - `shower` mode decision + manual override fields
- Planned classifier model:
  - `AnchorKind = 'travel' | 'local' | 'soft'`

## Resume Workflow
When resuming in a new chat, provide:
- Goal/task number
- Current branch and latest failing/passing test info
- Relevant dossier file(s)
- Any deviations already taken from guardrails

Then ask for:
- guardrails audit
- minimal file-touch implementation plan
- regression check mapping before edits
