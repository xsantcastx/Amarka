# Agent Workflow (Amarka)

## Default flow

1. **Orient**
   - Read the user request and any active files.
   - Scan relevant docs under `docs/` for domain context.
2. **Scope**
   - Clarify requirements, edge cases, and constraints.
   - If the task is large, plan before editing.
3. **Implement**
   - Make the smallest viable change.
   - Prefer config-driven changes over hard-coded edits.
4. **Verify**
   - Run checks that match the change.
   - For UI/data changes, run `npm run template:sync` before build/test.
5. **Report**
   - Summarize what changed and why.
   - Call out risks, follow-ups, and commands run.

## Project-specific rules

- **Generated files**: Do not edit or commit `src/config-loader/generated/*` or `src/environments/environment.generated.ts`.
- **Template sync**: `npm run template:sync` is required before `npm start`, `npm run build`, and `npm test`.
- **Config-first**: Prefer updates in `config/brands/<brand>/` over UI hard-coding.
- **Secrets**: `.env` stays local; use `.env.example` for documentation.
- **Docs location**: Project docs live in `docs/`. Keep agent docs here.

## Definition of done

- Requirements met and minimal changes applied.
- Relevant checks run or a reason documented if skipped.
- Any new agent, workflow, or template recorded in `agents/REGISTRY.md`.
