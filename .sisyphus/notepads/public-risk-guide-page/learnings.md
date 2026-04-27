
- 2026-04-26: Public-facing guide should stay light-first and restrained, following the login surfaces with `bg-background`, `bg-card`, `border-border`, muted support text, and calm hierarchy instead of dashboard-heavy cards or decorative AI styling.
- 2026-04-26: The shared foundation works best as a route-agnostic server component plus a separate typed content module so later public and authenticated wrappers can reuse the same exports unchanged.
- 2026-04-26: Downstream acceptance for the shared guide depends on the exact visible H1 text `Panduan Risiko di MANRIS`, so that title must stay in shared content rather than drifting in wrapper routes.
- 2026-04-26: Authenticated guide pages under `src/app/(app)` can stay as thin shared-component wrappers because the existing `(app)` layout already applies auth gating and the `AppShell` frame automatically.
- 2026-04-26: Breadcrumbs in `AppHeader` are resolved per accumulated pathname segment, so nested routes like `/panduan/risiko` need both parent and leaf entries in `breadcrumbMap` to avoid raw fallback labels.
- 2026-04-26: The public `/panduan-risiko` route works best as a thin server wrapper around `RiskGuidePage`, with the only route-specific addition being a calm post-guide CTA card that points back to `/login`.
- 2026-04-26: Login-surface discoverability fits best as a single muted text link placed directly under the existing first-login helper copy inside the auth card, keeping `Masuk` as the only dominant action while still exposing `/panduan-risiko`.
