.PHONY: ai.init

# claude code, kiro, gemini antigravity
AI_TOOLS := claude kiro agents

ai.init:
	@echo "Initializing AI directories..."
	@for tool in $(AI_TOOLS); do \
		mkdir -p .$$tool; \
		if [ -d .ai/skills ]; then ln -sfn ../.ai/skills .$$tool/skills; fi; \
		if [ -d .ai/agents ]; then ln -sfn ../.ai/agents .$$tool/agents; fi; \
	done
	@echo "Done! Symlinks created for: $(AI_TOOLS)"
