# Quarterly Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the nine-widget quarterly report agreed in docs/reports-redesign-decisions.md.

**Architecture:** A scoped backend quarterly dataset reconstructs period profiles, final observations, period tasks and occurred events. A single shared report model drives widgets, Vaul unit details and XLSX; the PDF endpoint uses the same backend dataset. Preserve the current dirty checkout as required by DESIGN.md; no unrelated commits or resets.

**Tech Stack:** Go/Fiber/PostgreSQL, Next.js/React/TypeScript, shadcn/Recharts, Vaul, ExcelJS, existing Maroto PDF renderer.

---

- [ ] Backend: add focused domain/repository/usecase/HTTP quarterly report files, wire existing DI and routes; parameterize organization scope. Test quarter boundaries, lifecycle reconstruction, valid reports, final observations and scope rejection.
- [ ] Canonical contract: period, comparisonPeriod, generatedAt, dataUpdatedAt, warnings, scoped organizations, current/previous risks, tasks and events; share definitions and derivation between visual and export paths.
- [ ] Design: document nine cards, denominator semantics, quiet responsive layout, all-unit table and read-only unit drawer in DESIGN.md; add production composition to the design-system catalog.
- [ ] Frontend: replace reports/page.tsx composition, preserve organization/group picker, default to completed quarter, add comparison and explicit loading/error/retry, four KPIs and five analysis cards, attention/all search and pagination.
- [ ] Exports: five XLSX sheets and summary/analysis PDF using selected scope and period; preserve snapshots, timestamps and unknown-value semantics.
- [ ] Review: independent spec review followed by code-quality review, fix findings; run targeted Go tests/vet, frontend type/lint/build and available browser checks.

Verification commands: `go test ./internal/usecase/report ./internal/repository/postgres ./internal/handler/http ./internal/service/pdfreport` in backend; `npx tsc --noEmit`, targeted `npx eslint`, and `npm run build` in frontend. Expected: successful exits, or explicitly documented pre-existing failures with scoped checks passing.

The accepted product decision document contains the full metric and interaction contract. This plan executes in the current session; user authorization to proceed is already recorded.
