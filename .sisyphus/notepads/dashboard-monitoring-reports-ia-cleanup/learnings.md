## 2026-04-03
- For the compliance monitoring workspace, keep the tab/query-param behavior intact and only update copy when reframing the page from reporting to operational follow-up.
- Use action-oriented language: review queues, track mitigation progress, and update KRI status.
- On the overview page, keep the dashboard summary-only: KPI cards + two analytics rows + a final handoff strip.
- The row balance that reads best here is Heatmap Risiko + Executive Alerts, then Risk Trend + Incident vs Mitigation Closure.
- Sidebar main-menu items should come from `src/lib/app-navigation.ts`; map string icon names back to imported Lucide components in the sidebar.
- Preserve `matchHrefs` for `/compliance/kri` so the monitoring item stays active for both monitoring and KRI routes.
- Breadcrumb labels should also come from `src/lib/app-navigation.ts` so header and sidebar stay in sync; add `/overview` there and keep `getBreadcrumbs` unchanged.
- For IA cleanup, keep cross-links lightweight: a single secondary CTA in the monitoring header and reciprocal helper-strip link in reports is enough to improve wayfinding without changing route behavior.
- The dashboard handoff strip can stay as a stable anchor point; verify it exists rather than rewriting it when adding adjacent navigation.
## 2026-04-04 — F2: Code Quality Review
- All 17 new/modified files pass antipattern checks: zero `as any`, `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `console.log`, empty catch blocks, commented-out code, `fmt.Println`, `// TODO`, or silently dropped errors.
- `console.error()` in `Promise.allSettled` rejection handlers is a project-wide pattern (66 occurrences across 23 files) — not a new-file-specific issue.
- All 6 new frontend components have proper `data-testid` attributes at the root and interactive element levels.
- Backend code follows Clean Architecture properly: handlers → usecases → repositories, with proper error wrapping via `fmt.Errorf`.
