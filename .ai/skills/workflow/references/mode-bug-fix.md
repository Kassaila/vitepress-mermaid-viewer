# Mode: bug-fix

Structured investigation → diagnosis → fix.

1. **Clarify if needed:** expected vs actual behavior, reproduction steps, error messages
2. **Create artifacts:**
   - `.tmp/<name>/progress.md` using the `progress.md` template (set status to `🔍 Investigating`)
   - `.tmp/<name>/investigation.md` using the `investigation.md` template
3. **Investigate codebase** — trace execution, search for relevant code
4. **Document hypotheses** as you go (even wrong ones are useful context)
5. **Present findings + proposed fix** — wait for user confirmation
6. **Implement fix** (update status in `progress.md` to `🔧 Fixing`)
7. On completion: update status in `progress.md` to `✅ Fixed`, suggest `git diff` + commit

## Rules specific to bug-fix mode

- Always investigate before fixing — no blind patches
- Document each hypothesis even if ruled out
- If the bug cannot be reproduced, document what was tried and mark as `❌ Cannot Reproduce`
- Prefer minimal targeted fixes over broad refactors
- If the fix reveals a deeper design issue, note it but suggest a separate `spec` or `plan` workflow
