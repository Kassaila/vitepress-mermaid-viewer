# Mode: plan

Planning only — no code changes.

1. **Ask clarifying questions** (up to 3) if the idea is vague
2. **Investigate codebase** — read relevant files to ground the plan
3. **Generate artifacts:**
   - `.tmp/<name>/progress.md` using the `progress.md` template (set status to `📋 Planning`)
   - `.tmp/<name>/plan.md` using the `plan.md` template
4. **Present plan** for review and update status in `progress.md` to `✅ Complete`
5. If user wants to proceed with implementation, suggest switching to `spec` or `quick-spec` mode

## Rules specific to plan mode

- **No code changes.** This mode only produces planning documents.
- Keep the plan actionable — someone should be able to implement from it step by step.
- Always ground the plan in actual codebase state (read files first).
