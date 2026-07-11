# Agent Instructions

This file is the canonical source of instructions and project context for all AI coding agents working on pearl.

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->

## Build & Test

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages (shared must build first)
pnpm test             # Run Vitest unit/integration tests
pnpm typecheck        # TypeScript type checking across all packages
pnpm lint             # Biome linter
pnpm lint:fix         # Biome auto-fix
pnpm format           # Biome formatter
pnpm dev              # Start dev servers
pnpm test:e2e         # Playwright E2E tests
pnpm test:e2e:ui      # Playwright E2E with UI
```

Pre-commit hooks (Husky + lint-staged) run Biome checks automatically.

## Architecture Overview

pearl is a pnpm monorepo with three packages:

- **`packages/shared`** -- TypeScript types (Issue, LabelDefinition, IssueStatus, Priority, IssueType). Built with `tsc`, outputs to `dist/`, and is consumed by both backend and frontend.
- **`packages/pearl-bdui`** -- Node.js/Fastify backend server for the beads issue tracker web UI. Uses Dolt (Git-for-data SQL database) with a primary/replica split for concurrent access. Logging uses Fastify's built-in Pino integration.
- **`packages/frontend`** -- React 19 SPA built with Vite and Tailwind CSS v4. Uses React Router for routing and TanStack Query for server-state management.

**Database:** Dolt runs in embedded mode for local development and server mode for team/CI environments. The `bd` CLI writes directly to the primary database; the web UI reads from the replica. Backend mutations go to the primary database and reads use the replica.

## Conventions & Patterns

- **Tooling:** Use Biome for linting and formatting, not ESLint or Prettier. Use Vitest for tests and Playwright for E2E tests.
- **Package manager:** Use pnpm workspaces exclusively. Never use npm or yarn.
- **Issue tracking:** Use `bd` (beads) exclusively. Never use TodoWrite, TaskCreate, or Markdown TODO lists.
- **Build order:** Build `packages/shared` before consumers because they import from its `dist/` output.
- **Database access:** Preserve the primary/replica split. Mutations go to primary; reads go to replica.

<!-- compound-agent:start -->
## Compound Agent Integration

This project uses compound-agent for session memory via **CLI commands**.

### CLI Commands (ALWAYS USE THESE)

**You MUST use CLI commands for lesson management:**

| Command | Purpose |
|---------|---------|
| `ca search "query"` | Search lessons - MUST call before architectural decisions; use anytime you need context |
| `ca knowledge "query"` | Semantic search over project docs - MUST call before architectural decisions; use keyword phrases, not questions |
| `ca learn "insight"` | Capture lessons - use AFTER corrections or discoveries |
| `ca list` | List all stored lessons |
| `ca show <id>` | Show details of a specific lesson |
| `ca wrong <id>` | Mark a lesson as incorrect |

### Mandatory Recall

You MUST call `ca search` and `ca knowledge` BEFORE:
- Architectural decisions or complex planning
- Patterns you've implemented before in this repo
- After user corrections ("actually...", "wrong", "use X instead")

**NEVER skip search for complex decisions.** Past mistakes will repeat.

Beyond mandatory triggers, use these commands freely — they are lightweight queries, not heavyweight operations. Uncertain about a pattern? `ca search`. Need a detail from the docs? `ca knowledge`. The cost of an unnecessary search is near-zero; the cost of a missed one can be hours.

### Capture Protocol

Run `ca learn` AFTER:
- User corrects you
- Test fail -> fix -> pass cycles
- You discover project-specific knowledge

**Workflow**: Search BEFORE deciding, capture AFTER learning.

### Quality Gate

Before capturing, verify the lesson is:
- **Novel** - Not already stored
- **Specific** - Clear guidance
- **Actionable** (preferred) - Obvious what to do

### Never Edit JSONL Directly

**WARNING: NEVER edit .claude/lessons/index.jsonl directly.**

The JSONL file requires proper ID generation, schema validation, and SQLite sync.
Use CLI (`ca learn`) — never manual edits.

See [documentation](https://github.com/Nathandela/compound-agent) for more details.
<!-- compound-agent:end -->

## Basic Memory

This repository is registered with [Basic Memory](https://docs.basicmemory.com/) under project **`pearl`** (notes in `docs/`). Use the `basic-memory` MCP server (configured at the user level for Claude Code and Codex CLI) to search, read, and write structured notes for this project.
