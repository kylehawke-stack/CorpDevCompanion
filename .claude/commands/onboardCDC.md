---
description: Onboard a new Claude session to the CorpDevCompanion project
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# CorpDevCompanion — Session Onboarding

You are resuming work on **CorpDevCompanion**, an M&A target prioritization app built for Hamilton Beach Brands (HBB). The user (Brady) frequently loses session context due to dropped connections, so your job is to quickly get oriented and ready to work.

## Step 1: Read Core Context Files

Read these files IN PARALLEL to understand the project:

1. `/mnt/c/Users/brady/projects/CorpDevCompanion/CLAUDE.md` — Project rules and background
2. `/mnt/c/Users/brady/projects/CorpDevCompanion/src/types/index.ts` — All type definitions
3. `/mnt/c/Users/brady/projects/CorpDevCompanion/src/context/GameStateContext.tsx` — State management
4. `/mnt/c/Users/brady/projects/CorpDevCompanion/src/App.tsx` — Routing and phase flow

## Step 2: Check Current State

Run these IN PARALLEL:

1. `cd /mnt/c/Users/brady/projects/CorpDevCompanion && git status --short` — What's been modified?
2. `cd /mnt/c/Users/brady/projects/CorpDevCompanion && git log --oneline -10` — Recent commits
3. `cd /mnt/c/Users/brady/projects/CorpDevCompanion && git diff --stat` — Scope of uncommitted changes

## Step 3: Report to the User

After reading, give Brady a concise status report:

1. **Uncommitted changes** — List modified files grouped by area (functions, pages, components, lib, types)
2. **Recent work** — Summarize the last 5 commits in plain English
3. **Ready prompt** — End with: "I'm up to speed. What are we working on?"

## Key Things to Remember

- **Project path**: `/mnt/c/Users/brady/projects/CorpDevCompanion`
- **Dev server**: Run `netlify dev` (not `npm run dev`) — saves Netlify credits
- **Always start the dev server** after making code changes so Brady can test
- **Build check**: `npm run build` runs tests + tsc + vite build
- **Claude model**: Functions use `claude-sonnet-4-20250514` via `@anthropic-ai/sdk`
- **Prompt caching**: `promptData` (~20K chars) goes in system message with `cache_control: { type: "ephemeral" }`
- Brady values **clean UX**, **efficient API usage**, and **no over-engineering**

If the user provides additional context about what they want to work on: $ARGUMENTS
