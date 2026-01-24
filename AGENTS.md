# Default Agent Instructions (Amarka)

Use this file as the repo-level default when no other agent instructions are provided.

## Projects (read first)

This repo is a multi-project workspace. Use these definitions to orient your changes:

- **Frontend (Angular app)**: `src/` is the main storefront and admin UI (Angular 18).
- **Cloud Functions**: `functions/` contains Firebase Functions and backend flags.
- **Brand/config system**: `config/brands/<brand>/` and `config/schema/` drive site content, feature flags, and backend toggles.
- **Docs**: `docs/` is the source of truth for project guidance and historical context.

## Workflow (default)

Follow `agents/WORKFLOW.md` for the standard flow: Orient → Scope → Implement → Verify → Report.

## Repo rules (must follow)

- Run `npm run template:sync` before build/test and before changes that rely on generated config.
- Do not edit or commit generated files:
  - `src/config-loader/generated/*`
  - `src/environments/environment.generated.ts`
- Prefer config-driven updates under `config/brands/<brand>/` over hard-coded UI changes.
- Never commit secrets; use `.env.example` for docs.

## Where to look for more guidance

- `docs/README.md` for the docs map and how to navigate domain areas.
- `agents/STRUCTURE.md` and `agents/ADAPTATION.md` if you need to create or update agent definitions.
