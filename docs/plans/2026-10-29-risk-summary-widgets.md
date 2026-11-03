# Risk summary widgets

Replace the /reports presentation with the supplied reference, using existing theme, risk colors, typography and Card primitives. Each section occupies a full row: overview (four metrics on desktop, two columns on narrow screens), severity distribution, unit ranking, and mitigation reporting status. Use real authorized period data; no simulation badge or invented activity completion. Severity uses effective risk profile scores and five Manrisk levels, with unknown scores explicit. Unit ranking counts high and very high profiles and includes all selected units. Reporting uses existing validated task-state semantics and zero denominators show a dash.

1. Update DESIGN.md and catalog copy before implementing the production composition.
2. Add tested aggregation for risk severity, ranked units and reporting counts.
3. Replace the report dashboard and loading state; retain period/group/unit controls and error/retry. Remove comparison controls, exports, risk table, unit drawer and superseded overview widgets from this page and delete unused presentation modules. Shared report services and exports used elsewhere remain.
4. Render the same production widgets in the catalog with matching illustrative filters.
5. Check calculations, lint, TypeScript and browser rendering at desktop and mobile widths. Review the final diff.

## Verification

Completed the production widgets, filter simplification, catalog and documentation sync, and deletion of superseded presentation/Excel-export modules. Shared backend report APIs remain compatible for Agent and other API consumers.

- 35 targeted calculation, period/scope/access and preference tests pass.
- ESLint passes for changed TypeScript sources; application TypeScript check passes with existing test sources excluded.
- Full repository TypeScript checking still reports errors in existing test sources. Shared UI contracts have 34 failures both before and after the changes (23 existing passes), verified against HEAD sources.
- Browser: real Q3 data, empty Q1 data, period changes, design-system production specimen, 12px radius/shadow, desktop layout and 390px mobile layout without horizontal overflow verified. Original Q3 selection and viewport restored.

## Layout and distill pass

Kept the four full-width widget sections. Removed the separate filter footer/divider and repeated visible scope count, preserving its screen-reader live status and selected-unit review/removal. Report options now align with the filter controls. Profile metrics share one desktop row and two columns on narrow screens; population, period and provisional status live together in its header. Card header-to-content gaps use 16px, outer section gaps stay 24px. Reporting shows each count once, retains nonzero actionable statuses and uses a single plain message when no reports are required. Production components remain the design-system examples.

Validated 35 existing report tests, changed-file ESLint, application TypeScript, 16px computed card gaps, reload preserving the current three-unit scope, and mobile 390px with no horizontal overflow.
