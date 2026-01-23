# Agent Adaptation (Amarka)

Agents should evolve with the repo. Use this guide when you discover new patterns or recurring tasks.

## When to update an agent

- A task repeats across multiple requests.
- A workflow changes (new scripts, new build steps).
- A new risk or failure mode appears.

## How to adapt

1. Update or create the relevant agent definition in `agents/definitions/`.
2. Record the change in `agents/REGISTRY.md`.
3. If the change affects dev workflow, add a note to `docs/`.

## Guardrails

- Avoid duplicating content already documented in `docs/`.
- Keep agent instructions concise and action-oriented.
- Prefer templates in `agents/templates/` to keep consistency.
