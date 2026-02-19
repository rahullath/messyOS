# MeshOS

MeshOS is an executive-function support app.

It is built to help people move through daily life when task initiation, sequencing, transitions, and recovery are hard.

This is not a productivity theater app. The goal is not output-maxing. The goal is daily stability.

## What MeshOS Is

- A practical scaffold for executive function
- Chain-first planning around real anchors and constraints
- A system for reducing ambiguity and transition friction
- User-controlled structure with manual override

## What MeshOS Is Not

- Not an AI life coach
- Not a crypto or finance product
- Not a habit-streak gamification app
- Not a surveillance/self-optimization loop

## Core Principles

- Clarity over optimization
- Chain integrity over punctual perfection
- Recovery over guilt spirals
- User agency over automation lock-in
- Privacy and user ownership of data

## Current Product Scope (V2.2 Stabilization)

### In active use

- Daily Plan
  - Chain view
  - Exit-gate flow
  - Manual anchors
  - Chain step editing and persistence
- Habits
  - Import + dedupe + merge correctness
  - Daily logging and streak context
- Account / Settings baseline
  - Profile, subscription shell, and usable settings

### In progress

- Collapse Mode (recovery-first mode when day execution breaks)
- Mobile UX hardening on core screens
- PWA install/offline baseline improvements

### Out of scope for current stabilization pass

- Finance module redesign
- Health module expansion
- Content/recommendation module buildout

These modules may appear in the repo but are not part of the current reliability target.

## Who MeshOS Is For

People who:

- Struggle to start tasks
- Freeze under ambiguity
- Lose the day after one disruption
- Need structure without rigid productivity culture
- Identify with ADHD traits, autistic traits, chronic overwhelm, or executive dysfunction patterns

## Product Direction

MeshOS is being shaped as an executive-function prosthetic layer:

- Useful in chaos, not only on perfect days
- Additive and minimal-risk implementation
- Recovery pathways (not failure screens)
- Support that can be reduced over time, not dependency by design

## Technical Stack

- Frontend: Astro + React + TypeScript + Tailwind CSS
- Backend: Astro API routes
- Database/Auth: Supabase (PostgreSQL + RLS)
- Deployment: Vercel

## Local Development

### Prerequisites

- Node.js 18+
- npm
- Supabase project

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env` (Supabase and any optional providers).
3. Run migrations against your Supabase database.
4. Start dev server:
   ```bash
   npm run dev
   ```

## Security Baseline

- Auth required on protected APIs
- `user_id` derived from server session, never trusted from client payload
- User-scoped queries on data access
- RLS enabled on touched tables

## Status

MeshOS is under active stabilization and iteration.

The current objective is a reliable, multi-user-safe core experience for:

- Daily Plan
- Habits
- Settings / account basics

Once this is stable, additional modules and SEO/content expansion will follow.
