.PHONY: ai.init mcp.init

# ── AI harness entry-points ────────────────────────────────────────────────
# .ai/ is the canonical tree; a harness directory holds symlinks into it and
# that harness's own per-machine settings. The links are not tracked, so `make
# init` builds them on a fresh clone; this target on its own is for adding a
# harness or repairing a link.
#
# One name per harness directory: .claude/ (Claude Code), .kiro/ (Kiro),
# .agents/ (Antigravity). Claude Code loads .claude/rules/*.md, so .ai/steering
# is linked there as `rules`.
AI_TOOLS := claude kiro agents
AI_DIRS  := skills agents steering

ai.init: mcp.init ## Point the harness directories at .ai/ (skills, agents, steering)
	@for dir in $(AI_DIRS); do \
		if [ ! -d .ai/$$dir ]; then echo "   no .ai/$$dir — nothing to link"; continue; fi; \
		for tool in $(AI_TOOLS); do \
			link=$$dir; \
			if [ "$$tool" = claude ] && [ "$$dir" = steering ]; then link=rules; fi; \
			mkdir -p .$$tool; \
			if [ -e .$$tool/$$link ] && [ ! -L .$$tool/$$link ]; then \
				echo "   .$$tool/$$link is a real directory — left alone, .ai/$$dir is NOT reachable from it"; \
				continue; \
			fi; \
			ln -sfn ../.ai/$$dir .$$tool/$$link && echo "   .$$tool/$$link -> ../.ai/$$dir"; \
		done; \
	done

# Claude Code reads .mcp.json only from the repository root; Kiro and Antigravity
# require it under their own harness directory, so those two are symlinked back
# to it.
mcp.init: ## Link .mcp.json into the harness directories that need their own copy
	@if [ -f .mcp.json ]; then \
		for tool in $(AI_TOOLS); do \
			case $$tool in \
				kiro)   mkdir -p .kiro/settings; \
				        ln -sfn ../../.mcp.json .kiro/settings/mcp.json \
				          && echo "   .kiro/settings/mcp.json -> ../../.mcp.json" ;; \
				agents) mkdir -p .agents; \
				        ln -sfn ../.mcp.json .agents/mcp_config.json \
				          && echo "   .agents/mcp_config.json -> ../.mcp.json" ;; \
				claude) echo "   claude reads .mcp.json from the repository root — nothing to link" ;; \
			esac; \
		done; \
	else \
		echo "   no .mcp.json — nothing to link"; \
	fi
