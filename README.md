# Astro x Supabase - Personal Agentic Operating System

```sh
npm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

# messyOS

**messyOS** is your personal, all-in-one life operating system.  
Built for a single user—yourself—to help you organize, track, analyze, and optimize every aspect of your life: health, habits, content, finances, productivity, pets, and more.

---

## Vision

Create an always-evolving, comprehensive dashboard and application platform that adapts as your life, habits, and goals change.  
**messyOS** is NOT just another task manager or tracker: it is THE app for your lifelong data, decisions, and dreams.

---

## Features

### 1. Habits & Health
- Import & track habits (CSV from Loop Habits, manual entries)
- Streaks, routines, quitting & forming new habits (smoking, gym, walks, etc.)
- Track medication, sleep, weight, workouts (Cult.fit, Huawei Band 9 data integration)
- Food & groceries: what you have, what you eat, what to buy next
- Pet care: food, litter, vet tasks

### 2. Content & Recommendations
- Track everything you watch (Serialized.com data import)
- Personalized movie/book recommendations by genre, language, etc.
- Lifelong content plan: what to watch/read next, based on your history

### 3. Productivity & Tasks
- Hour-by-hour, day-to-day task tracking (work, learning, side projects, job applications)
- Progress tracking for big goals (applying to universities, moving abroad, pet relocation)
- Subscriptions & trials: never miss a renewal or free trial ending

### 4. Finances
- Unified finance dashboard (bank statements, crypto, expenses, breakdowns)
- Track trial periods, recurring bills, and crypto portfolio
- Expense categorization, budgeting, and financial insights

### 5. Coding & Projects
- Track your side projects (what’s blocking you, time spent, pivots, issues)
- Build accountability for long-term goals (decentralized streaming, crypto bots, etc.)
- Analyze why you stop or lose momentum, and how to fix it

### 6. Digital Wellbeing
- Screentime by app (via Digital Wellbeing export)
- Track personal habits (even the awkward ones—laundry, water, etc.)

---

## Tech Stack

- **Astro** (UI, web dashboard)
- **TypeScript** (fullstack logic)
- **Supabase** (auth, database, file storage)
- **TailwindCSS** (styling)
- **CSV/Excel importers** for habit, finance, health, and application data

---

## Quickstart

1. **Clone the repo:**
   ```sh
   git clone https://github.com/rahullath/messyOS.git
   cd messyOS
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up Supabase:**
   - Copy `.env.example` to `.env` and add your Supabase keys.
   - Run `database-setup.sql` on your Supabase project.

4. **Run locally:**
   ```sh
   npm run dev
   ```

---

## Philosophy

- **Extreme Personalization:** Designed for *you*—no compromises for “general users.”
- **Iterate Fast:** Add/remove features as your life evolves.
- **Data Ownership:** All your data stays with you (Supabase backend).
- **Automation-First:** Import/export from all sources you use (health, habits, finance apps).

---

## Roadmap & Contributing

This is a living project. As your life changes, so will messyOS.  
If you’re reading this and want to borrow ideas, fork away!

---

## License

MIT (see LICENSE file).

---

> *messyOS: The last app you’ll ever need to organize yourself.*
