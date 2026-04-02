# Incident Risk Suggestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual incident form action that generates AI-backed risk suggestions and lets users attach suggested risks before saving the incident.

**Architecture:** Extend the existing AI incident extraction domain with a focused single-incident suggestion request, expose it through a dedicated backend endpoint, and reuse the existing suggestion card pattern in the manual incident form. Keep the user in control by treating AI output as selectable recommendations only.

**Tech Stack:** Go, Fiber, OpenAI repository, Next.js App Router, React 19, TypeScript.

---

### Task 1: Backend TDD for manual suggestion use case

**Files:**
- Create: `backend/internal/usecase/ai/incident_risk_suggestion_test.go`
- Modify: `backend/internal/usecase/ai/extract_batch.go`

- [ ] Write failing tests for required-field validation and severity normalization.
- [ ] Run `go test ./internal/usecase/ai -run 'TestGenerateManualIncidentRiskSuggestions|TestNormalizeIncidentSeverity'` and confirm the new tests fail for missing implementation.
- [ ] Add the minimal production code to satisfy those tests.
- [ ] Re-run the same test command and confirm it passes.

### Task 2: Backend endpoint and repository wiring

**Files:**
- Modify: `backend/internal/domain/entity/ai.go`
- Modify: `backend/internal/domain/repository/ai.go`
- Modify: `backend/internal/repository/openai/ai.go`
- Modify: `backend/internal/handler/http/ai.go`
- Modify: `backend/cmd/server/main.go`

- [ ] Add request/response entity shapes and repository interface method.
- [ ] Implement OpenAI repository method that scopes risks by organization and returns top suggestions.
- [ ] Add handler request parsing plus route registration for the new endpoint.
- [ ] Run `go test ./internal/usecase/ai ./internal/repository/openai/...` or the closest passing subset available.

### Task 3: Manual incident form integration

**Files:**
- Modify: `frontend/src/types/incident.ts`
- Modify: `frontend/src/app/(app)/incidents/new/page.tsx`

- [ ] Add manual suggestion state, stale tracking, and request payload typing.
- [ ] Add the `Generate suggestion` button, loading state, and AI suggestion card list.
- [ ] Keep manual search and selection behavior intact while syncing selected suggestions with `manualLinkedRiskIds`.
- [ ] Run `npm run build` in `frontend` and fix any type or rendering issues.

### Task 4: Final verification

**Files:**
- Modify only if verification reveals issues.

- [ ] Run `go test ./internal/usecase/ai` in `backend`.
- [ ] Run `npm run build` in `frontend`.
- [ ] Review the manual incident form flow for loading, empty, stale, and selection states.
