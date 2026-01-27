Better description (what’s wrong + what we want)

The Admin → Layout/Settings section is currently messy and unreliable. It’s trying to control UI styling (button colors, theme, layout tweaks, etc.) but the experience is confusing, hard to maintain, and produces inconsistent results across pages.

Proposal: remove the current “Layout Settings” implementation and replace it with a proper, structured Theme + Layout system that:

is easy to understand for an admin user

produces consistent UI across the app

is maintainable for devs (no random overrides everywhere)

Proposed task (ticket-ready)

Title: Replace Admin “Layout Settings” with a real Theme & Layout Manager

Goal: Deprecate the existing layout/styling settings UI and rebuild it as a clean, predictable system for controlling global styling (colors, buttons, fonts, spacing) and basic layout options.

Scope (MVP):

Remove current layout settings UI + related logic/overrides

Implement a Theme Manager with:

Primary color (buttons/links)

Secondary color

Background + surface color (cards)

Text color

Border radius (buttons/cards)

Font scale (S/M/L) or base font size

Provide Live Preview in the admin panel

Add Reset to default + Save & Apply

Persist theme settings (DB/Firestore) and apply globally on app load

Acceptance criteria:

Theme changes apply consistently across all pages (no page-by-page weirdness)

Buttons/inputs/cards follow the same design tokens everywhere

Admin UI is simple: change values → preview → save

Can safely rollback to default theme in one click

Planning idea (how to rebuild it without chaos)
Phase 1 — Audit & remove the mess

Identify what the current “layout settings” actually changes (CSS vars? inline styles? class toggles? stored settings?)

Remove/disable it behind a feature flag (so we can ship safely)

Clean up any hardcoded overrides that conflict with global styling

Phase 2 — Introduce “Design Tokens” (single source of truth)

Create a simple theme object like:

colors.primary, colors.secondary, colors.bg, colors.surface, colors.text

radius.md

font.base
Then map those tokens to the UI layer (CSS variables or a theme provider).

Phase 3 — Build the Admin Theme Manager UI

Left: controls (color pickers, sliders, dropdowns)

Right: preview panel (buttons, forms, cards, table, alerts)

Add presets: “Default”, “Dark”, “High contrast”, “Brand preset”

Phase 4 — Persist & apply globally

Save theme to DB under something like settings.theme

Load on app boot and apply CSS variables globally

Add caching + fallback to defaults if theme is missing/broken

Phase 5 — Guardrails (avoid breaking the UI again)

Validate color inputs (hex only)

Provide “Reset to default”

Add basic tests / snapshot checks for theme application