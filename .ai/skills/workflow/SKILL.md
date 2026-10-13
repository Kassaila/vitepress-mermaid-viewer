---
name: workflow
description:
  'Unified development workflow with modes: spec, quick-spec, plan, bug-fix. First argument is the
  mode, rest is the task description. Example: `spec Add payment method` or `bug-fix Login redirect
  loop`.'
---

## Purpose

Single entry point for structured development workflows. Supports the modes below depending on the
nature of the task.

## Modes

| Mode         | Use case                                        | Code changes                       |
| ------------ | ----------------------------------------------- | ---------------------------------- |
| `spec`       | Complex features needing iterative refinement   | Yes (after approval at each stage) |
| `quick-spec` | Medium tasks — fast spec, then implement        | Yes (after one-shot spec)          |
| `plan`       | Thinking through an approach, no implementation | No                                 |
| `bug-fix`    | Investigating and fixing a bug                  | Yes (after diagnosis)              |

## Instructions

### 1. Parse arguments

Format: `<mode> <task description>`

- Extract the first word as `mode` (one of: `spec`, `quick-spec`, `plan`, `bug-fix`)
- The rest is the task description
- **If mode is missing or not recognized:** Ask the user via `ask_question` with the 4 options:
  - `spec` — Complex features needing iterative approval
  - `quick-spec` — Medium tasks — fast spec, then implement
  - `plan` — Thinking through an approach (no code changes)
  - `bug-fix` — Investigating and fixing a bug
- **If task description is missing:** Ask the user to state the task description before proceeding
- Convert task description to kebab-case for directory name (e.g., "Add Payment Method" →
  "add-payment-method")

### 2. Gather context (all modes)

- `git branch --show-current`
- `git log --oneline -5`
- `git status --short`
- `ls -1 .tmp/ 2>/dev/null || echo "(none)"`

### 3. Check existing

Read `.tmp/<task-name>/` if directory exists — resume from last state.

### 4. Create directory

`.tmp/<task-name>/`

### 5. Execute mode-specific workflow

Load the corresponding reference and follow its instructions:

- `spec` → [Mode: spec](./references/mode-spec.md)
- `quick-spec` → [Mode: quick-spec](./references/mode-quick-spec.md)
- `plan` → [Mode: plan](./references/mode-plan.md)
- `bug-fix` → [Mode: bug-fix](./references/mode-bug-fix.md)

## Templates

Use these templates when generating artifacts in `.tmp/<name>/`:

- **requirements.md** → [Requirements: [Name]](./assets/requirements.md)
- **design.md** → [Design: [Name]](./assets/design.md)
- **tasks.md** → [Tasks: [Name]](./assets/tasks.md)
- **plan.md** → [Plan: [Name]](./assets/plan.md)
- **investigation.md** → [Bug: [Name]](./assets/investigation.md)
- **progress.md** → [Progress: [Name]](./assets/progress.md)

## Progress tracking (all modes)

Create `.tmp/<name>/progress.md` using the `progress.md` template.

Update after each significant step. Status values by mode:

- **spec:** 📝 Requirements → 🏗️ Design → 📋 Tasks → 🚀 Implementing → ✅ Complete
- **quick-spec:** 📋 Specifying → 🚀 Implementing → ✅ Complete
- **plan:** 📋 Planning → ✅ Complete
- **bug-fix:** 🔍 Investigating → 🔧 Fixing → ✅ Fixed / ❌ Cannot Reproduce

## Rules

- `.tmp/` must be in `.gitignore`
- Each task gets its own directory under `.tmp/`
- Always investigate relevant code before generating artifacts
- Never skip user confirmation in `spec` mode
- Keep artifacts actionable — someone should be able to implement from them
- If resuming, pick up from last incomplete stage
- Prefer minimal targeted changes over broad refactors
- On completion, suggest `git diff` review + commit

Workflow request: $ARGUMENTS
