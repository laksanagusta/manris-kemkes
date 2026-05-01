# KMK Risk Charter UI Task 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Risk Charter list and detail/form pages that match the visual language of the risk register while staying charter-specific.

**Architecture:** Implement the smallest set of frontend artifacts needed for Task 3: typed charter model, API client, list page, detail/form page, and navigation wiring. Reuse existing shells like `FormPage`, `FormHeader`, `FormSection`, and risk-register-inspired spacing/table/accordion patterns instead of extracting new shared abstractions.

**Tech Stack:** Next.js App Router + React + TypeScript + existing UI primitives + node:test build verification.

---

## File Structure Map

- Create: `frontend/src/types/risk-charter.ts` — Risk Charter frontend types.
- Create: `frontend/src/lib/api/risk-charters.ts` — API client for listing/getting/creating/updating charters.
- Create: `frontend/src/app/(app)/management/charters/page.tsx` — charter list page with register-like toolbar/table surface.
- Create: `frontend/src/app/(app)/management/charters/[id]/page.tsx` — charter detail/edit page with accordion sections.
- Modify: `frontend/src/lib/app-navigation.ts` — add navigation and breadcrumbs.

### Task 1: Add charter types and API client

**Files:**
- Create: `frontend/src/types/risk-charter.ts`
- Create: `frontend/src/lib/api/risk-charters.ts`

- [ ] **Step 1: Write the type and client files**
- [ ] **Step 2: Run build to verify type/client compile**

### Task 2: Build charter list page

**Files:**
- Create: `frontend/src/app/(app)/management/charters/page.tsx`

- [ ] **Step 1: Build risk-register-like header/filter/table layout**
- [ ] **Step 2: Wire list API, loading, empty, and error states**
- [ ] **Step 3: Add status badges and row action to open detail page**
- [ ] **Step 4: Run build verification**

### Task 3: Build charter detail/edit page

**Files:**
- Create: `frontend/src/app/(app)/management/charters/[id]/page.tsx`

- [ ] **Step 1: Build page shell with `FormPage` + `FormHeader`**
- [ ] **Step 2: Add register-like accordion/section flow for charter fields**
- [ ] **Step 3: Wire get/update/create behavior using API client**
- [ ] **Step 4: Render `uprStructure` as editable repeatable rows**
- [ ] **Step 5: Run build verification**

### Task 4: Wire navigation

**Files:**
- Modify: `frontend/src/lib/app-navigation.ts`

- [ ] **Step 1: Add Risk Governance group with Piagam MR item**
- [ ] **Step 2: Add breadcrumb labels for list/detail routes**
- [ ] **Step 3: Run final verification**

```bash
cd frontend
npm run build
```

Expected: PASS.
