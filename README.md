# MessyOS - Your Smart Prosthetic

> **"THE app"** — A single, evolving system that ingests, understands, correlates and gently optimizes your entire life so the mundane stops eating your executive function and you can actually live.

## Vision

MeshOS is **not** a productivity app, habit tracker, finance tool or planner. It reduces friction from mundane activities.

It is a **personal data OS** that:

- Accepts life as it actually happens (messy, multimodal, inconsistent)
- Quietly structures & connects everything
- Surfaces just enough insight to remove blockers
- Protects chain integrity instead of punishing lateness
- Adapts to neurodivergence rather than trying to neurotypical-ize you

Core thesis:  
**Most executive dysfunction isn't laziness — it's friction from poorly modeled mundane dependencies.**  
Remove that friction → actual living becomes possible.

## Core Philosophy

1. **Dump first, structure second** — input should feel like talking to a friend, not filling forms
2. **Chain integrity > punctuality** — late but complete is success; complete but broken is failure
3. **Passive ingestion wins** — the less you have to remember to log, the more accurate the system becomes
4. **Correlation over causation** — show patterns ("when you shower → 3× habit adherence next day"), let user decide meaning
5. **Mundane as first-class citizen** — grocery expiry, cat litter, shower gel levels, phone battery at wake-up are **core data**, not afterthoughts
6. **Append-only evolution** — never break what already works; layer understanding on top

## Current Data Domains & Ingestion Status (Feb 2026)

| Domain                     | Primary Source                  | Ingestion Method                  | Coverage       | Key Data Points                                      | Value to Plan Builder / Chains                     |
|----------------------------|---------------------------------|------------------------------------|----------------|------------------------------------------------------|-----------------------------------------------------|
| Wake-up & morning context  | MacroDroid                      | HTTP POST on first unlock after sunrise | Daily, real-time | wake_timestamp, battery %, is_charging, device name | Anchor for Wake Ramp, chain start time, low-battery reminder |
| Habits                     | Loop Habits                     | CSV import (already working)       | ~1 year        | 13 habits, checkmarks, scores, daily notes (1 month) | Correlation engine (shower → habit cascade)         |
| Sleep & biometrics         | Huawei Band 9                   | Manual / future Health Sync CSV   | ~1 year        | sleep start/end, stages, quality, HR, stress, steps  | Energy baseline, adjust Wake Ramp duration          |
| Grocery / Pantry / Expiry  | Receipts + manual               | Planned: receipt scan → OCR → DB   | In progress    | items, qty, expiry est., price, nutrition            | Expiry-driven meal suggestions, shopping reminders  |
| Finances                   | Monzo                           | Planned: CSV statements            | Not yet        | spends, categories, budgets                          | Stress / scarcity signals → lighter task load       |
| Content consumption        | Serializd                       | Python + Selenium scraper          | Ongoing        | shows, ratings, reviews                              | Dopamine/avoidance patterns                         |
| Code / creative output     | GitHub                          | Planned: personal access token API | Not yet        | commits, PRs, repos                                  | Momentum vs avoidance detection                     |
| University                 | Calendar + manual               | Already partial (CSV import)       | Partial        | classes, assignments due                             | Anchor classification, attendance proxy             |
| Cat care                   | Manual                          | Planned: button macro              | Not yet        | litter clean status, food level                      | Mundane chore chain integrity                       |
| Household supplies         | Receipts                        | Bundle with grocery ingestion      | Not yet        | toiletries, cleaning products expiry                 | Repurchase reminders, chain friction points         |
| Gym / protein              | Manual + food log               | Planned: tie to grocery + notes    | Not yet        | workouts, protein intake                             | Energy / recovery feedback loop                     |
| Social                     | None yet                        | Planned: manual or calendar events | None           | social events attended                               | Nihilism / bed-rot prevention                       |

## Architecture & Tech Stack (Feb 2026)

- **Frontend** — Astro.js + TypeScript + React islands + Tailwind
- **Backend** — Astro API routes + Supabase (PostgreSQL + Edge Functions)
- **AI** — Google Gemini (via edge functions) + local LLM potential for notes
- **Database** — Supabase (main tables + JSONB metadata)
- **Ingestion** — CSV parsers, HTTP triggers (MacroDroid), planned OCR/upload endpoints
- **Deployment** — Vercel

## Key Modules (High-Level)

| Module                     | Status          | Core Responsibility                                                                 | Next Milestone                              |
|----------------------------|-----------------|-------------------------------------------------------------------------------------|---------------------------------------------|
| Wake Detection             | Live            | First unlock after sunrise → wake context to DB                                     | Add more context fields (is_charging, etc.) |
| Habits Engine              | Live            | Parse Loop Habits CSVs, correlate with other domains                                | Parse daily notes with local LLM            |
| Daily Plan / Chain Engine  | In progress (V2)| Chain-first planning anchored on calendar + wake time                               | Finish chain templates + Exit Gate UI       |
| Data Understanding Engine  | Live + expanding| Pattern detection, correlations, quality scoring across domains                     | Add cross-domain views (habit vs sleep)     |
| Grocery / Pantry           | Planned         | Receipt → items → expiry → recipe suggestions                                       | Choose app (AnyList / KitchenPal) + parser  |
| Finance                    | Planned         | Monzo CSV → spend patterns, budget stress signals                                   | Monthly CSV upload endpoint                 |
| Content Taste              | Live (scraper)  | Serializd → viewing patterns, dopamine signals                                      | Replace Selenium with cleaner API if exists |
| Health Biometrics          | Planned         | Huawei → sleep / stress / steps → energy baseline                                   | Health Sync CSV auto-import                 |

## Philosophy in Action

- **No rigid templates** — chains are generated from anchors + user patterns, not forced calendars
- **Success = chain integrity** — late but complete > on-time but broken
- **Friction first** — mundane blockers (expiry items, litter, low battery) are **primary** data, not side quests
- **Passive wins** — MacroDroid wake trigger, CSV imports, receipt photos > manual logging
- **Correlations over rules** — "when shower skipped → 60% chance next day habits collapse" > "shower at 07:15"

## Current Wins (Feb 2026)

- Wake detection reliably sending timestamp + battery % to DB
- Loop Habits CSV → habit streaks + correlations working
- Chain-based execution model designed (V2 spec complete)
- Append-only architecture — nothing broken while adding new understanding

## Next Realistic 4–8 Week Wins

1. Finish Chain Engine V2 MVP (anchors → chains → Exit Gate UI)
2. Add 2–3 more MacroDroid context macros (app opened on Instagram, screen locked, manual "step done")
3. Pick one grocery app → build receipt → pantry parser
4. Run first cross-domain correlation (shower habit vs next-day chain integrity)
5. Add simple "low battery at wake" rule in plan generator

MeshOS is slowly becoming the external brain that remembers the boring stuff so you don't have to.

Let me know which module / ingestion path you want to tackle next — I can give concrete steps, code snippets, MacroDroid configs or DB schema ideas whenever you're ready.  
No pressure, no overwhelm — one friction point at a time. 😊
