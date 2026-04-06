# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Nuxt 4 (Vue 3 + Nitro) · SQLite (better-sqlite3 + Drizzle ORM) · Tailwind CSS · Zod validation

## Conventions

- **Vue Component**: template > script > style (if needed)
- **Auto-imports**: Nuxt auto-imports composables, components, H3 utilities — no manual imports needed for those.
- **ESLint**: curly braces required, single quotes, `space-unary-ops` enforced (e.g. `! foo` not `!foo`) including vue templates, no `any`.
- **Naming**: no single-letter variables in function args/callbacks except `event`. Use descriptive names (e.g. `models.map(m => ...)` > `models.map(model => ...)`).
- **Validation**: All API inputs validated with Zod at the boundary.
- **DB**: SQLite file `data/beat.db`, WAL mode, foreign keys enforced with cascade deletes. All primary keys are `text` UUIDs (via `crypto.randomUUID()`).
