# Mode: spec

Full iterative cycle — requirements → design → tasks → implementation. User approves each stage
before the next begins.

## Stage 1: Requirements

1. **Ask 3–5 clarifying questions** to understand the problem, users, constraints, scope
2. **Investigate codebase** — read relevant files
3. **Generate** `.tmp/<name>/requirements.md` using the `requirements.md` template (and initialize
   `.tmp/<name>/progress.md` with status `📝 Requirements`)
4. **Present to user** — wait for approval. Do NOT proceed until confirmed.
5. Update status header in `requirements.md` to `✅ Approved` and `progress.md` status to
   `🏗️ Design`

## Stage 2: Design

1. **Generate** `.tmp/<name>/design.md` using the `design.md` template
2. **Present to user** — wait for approval.
3. Update status header in `design.md` to `✅ Approved` and `progress.md` status to `📋 Tasks`

## Stage 3: Tasks

1. **Generate** `.tmp/<name>/tasks.md` using the `tasks.md` template
2. **Present to user** — wait for approval.
3. Update status header in `tasks.md` to `🚀 In Progress` and `progress.md` status to
   `🚀 Implementing`

## Stage 4: Implementation

1. Execute tasks one by one from `tasks.md`
2. After each task: mark `- [x]` in tasks.md, update progress.md
3. On completion: verify acceptance criteria, update `progress.md` status to `✅ Complete`, suggest
   `git diff` + commit
