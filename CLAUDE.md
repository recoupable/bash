# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

**Always commit and push changes after completing a task.** Follow these rules:

1. After making code changes, always commit with a descriptive message
2. Push commits to the current feature branch
3. **NEVER push directly to `main`** - always use feature branches and PRs
4. Before pushing, verify the current branch is not `main`
5. **Open PRs against the `main` branch**
6. After pushing, check if a PR exists for the branch. If not, create one with `gh pr create --base main`
7. **After creating a PR, always wait for explicit user approval before merging.** Never merge PRs autonomously.

### Starting a New Task

Checkout main, pull latest, and create your feature branch from there:

```bash
git checkout main && git pull origin main && git checkout -b <branch-name>
```

## Build Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Start dev server
pnpm build          # Fetch agent data + production build
pnpm lint           # Run ESLint
```

## Architecture

- **Next.js 16** with App Router, React 19
- `app/` - Pages and API routes
  - `app/api/agent/` - AI agent endpoint (Claude Haiku 4.5 via ToolLoopAgent)
  - `app/api/fs/` - File serving endpoint
  - `app/components/` - Terminal UI components
  - `app/components/lite-terminal/` - Custom terminal emulator with ANSI support
  - `app/components/terminal-parts/` - Terminal commands, input handling, markdown
- `lib/` - Core business logic:
  - `lib/agent/` - AI agent configuration (system instructions, response handling)
  - `lib/recoup-api/` - Recoup-API integration (sandbox creation, snapshot persistence)
  - `lib/sandbox/` - Vercel Sandbox management (create, restore, snapshot)

## Key Technologies

- **AI**: Vercel AI SDK (`ai` package), ToolLoopAgent with Claude Haiku 4.5
- **Terminal**: `just-bash` (TypeScript bash interpreter), custom `LiteTerminal` emulator
- **Sandbox**: `@vercel/sandbox` for isolated execution environments
- **Auth**: Privy (`@privy-io/react-auth`)
- **Styling**: Tailwind CSS 4, Geist design system

## Code Principles

- **SRP (Single Responsibility Principle)**: One exported function per file
- **DRY (Don't Repeat Yourself)**: Extract shared logic into reusable utilities
- **KISS (Keep It Simple)**: Prefer simple solutions over clever ones
- **YAGNI**: Don't build for hypothetical future needs
- **File Organization**: Domain-specific directories (e.g., `lib/sandbox/`, `lib/recoup-api/`)

## Environment Variables

- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy authentication
- `NEXT_PUBLIC_VERCEL_ENV` - Environment detection (`production` vs other) for API URL routing
