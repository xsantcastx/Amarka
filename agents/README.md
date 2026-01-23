# Amarka Agent System

This folder defines how agents work on this repo. It mirrors the Everything-Claude-Code philosophy, but customized for Amarka's workflow and stack.

## Folder map

| Path | Purpose |
|------|---------|
| agents/WORKFLOW.md | Default agent workflow for this repo |
| agents/STRUCTURE.md | How to create and structure new agents |
| agents/ADAPTATION.md | How agents should evolve with the codebase |
| agents/REGISTRY.md | Index of local agents and their owners |
| agents/definitions/README.md | Where local agent definitions live |
| agents/templates/agent.md | Template for new agent definitions |
| agents/templates/handoff.md | Handoff template for multi-agent work |

## How to start (new agent)

1. Read `agents/WORKFLOW.md` and `agents/STRUCTURE.md`.
2. If you need a new agent, use `agents/templates/agent.md` and add it to `agents/definitions/`.
3. Register it in `agents/REGISTRY.md`.
4. Keep docs under `docs/` when possible; keep this folder focused on agent behavior.

## Core principles

- Repo-aware: follow Amarka-specific build and config flows.
- Small changes: prefer incremental edits with validation.
- Explicit handoffs: document context, commands, and risks.
- No secrets: never commit `.env` or generated files.

## Related sources

- `everything-claude-code/agents/` for baseline agent patterns
- `everything-claude-code/rules/` for delegation and review triggers
