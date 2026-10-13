# Mode: quick-spec

Everything in one pass — minimal clarification, generates all artifacts at once, then implements.

1. **Ask ≤2 focused questions** (skip if request is clear enough)
2. **Investigate codebase** — read relevant files
3. **Generate in one response:**
   - `.tmp/<name>/progress.md` using the `progress.md` template (set status to `📋 Specifying`)
   - `.tmp/<name>/requirements.md` using the `requirements.md` template
   - `.tmp/<name>/design.md` using the `design.md` template
   - `.tmp/<name>/tasks.md` using the `tasks.md` template
4. **Present to user** — ask if they want to adjust or start implementation
5. If user says "go" / "implement" / confirms → update `progress.md` status to `🚀 Implementing` and
   execute tasks one by one
6. Track progress using `progress.md`. On completion, update `progress.md` status to `✅ Complete`

## Key differences from `spec` mode

- Maximum 2 clarifying questions (vs 3–5 in spec)
- All three artifacts generated in a single response (no stage-by-stage approval)
- Bias toward action — don't over-ask, start generating
- User can still adjust after seeing the spec before implementation begins
