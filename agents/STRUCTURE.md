# Agent Structure (Amarka)

## Where agents live

- Local agent definitions live in `agents/definitions/`.
- The shared baseline comes from `everything-claude-code/agents/`.

## Naming conventions

- File name: `kebab-case.md` (e.g., `content-migrator.md`).
- Agent name: same as file name.

## Required frontmatter

Each agent file must start with frontmatter:

```yaml
---
name: agent-name
role: short purpose statement
scope: when to use
inputs: required context or files
outputs: expected deliverables
constraints: safety or repo-specific rules
---
```

## Required sections

- **Purpose**
- **When to Use**
- **When NOT to Use**
- **Workflow** (step-by-step)
- **Success Criteria**
- **Risks / Gotchas**

## Registration

- Add the agent to `agents/REGISTRY.md`.
- Note the owner, last updated date, and dependencies.
