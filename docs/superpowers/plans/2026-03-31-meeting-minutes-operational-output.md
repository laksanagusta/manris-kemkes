# Meeting Minutes Operational Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI-generated meeting minutes action-first by expanding the backend JSON schema and reordering the frontend output for operational follow-up, including a scan-friendly `keyPoints` section.

**Architecture:** Extend the backend meeting-minutes contract in the shared AI entity and OpenAI prompt, then update the meeting workspace rendering so action items and open issues lead the experience. The implementation should remain backward-compatible with partial AI output by using safe frontend defaults and visible confirmation badges.

**Tech Stack:** Go, Fiber, OpenAI JSON responses, Next.js App Router, React, TypeScript

---

### Task 1: Expand Backend Meeting Minutes Schema

**Files:**
- Modify: `backend/internal/domain/entity/ai.go`
- Modify: `backend/internal/repository/openai/ai.go`
- Test: `backend/internal/usecase/ai/minutes_test.go`

- [ ] **Step 1: Write the failing test**

Create a test that unmarshals the expanded meeting-minutes JSON payload into `entity.MeetingMinutes` and asserts `openIssues`, `nextCheckIn`, `status`, and `needsConfirmation` are preserved.

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/usecase/ai -run TestMeetingMinutesExpandedSchema -v`
Expected: FAIL because the current structs do not expose the new fields.

- [ ] **Step 3: Write minimal implementation**

Add the new fields to `entity.ActionItem` and `entity.MeetingMinutes`, including `keyPoints`, then update `buildMinutesPrompt` so the model is instructed to emit the expanded JSON contract and fallback behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/usecase/ai -run TestMeetingMinutesExpandedSchema -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/domain/entity/ai.go backend/internal/repository/openai/ai.go backend/internal/usecase/ai/minutes_test.go
git commit -m "feat: expand meeting minutes schema"
```

### Task 2: Make Frontend Minutes View Action-First

**Files:**
- Modify: `frontend/src/components/meeting-intelligence-workspace.tsx`

- [ ] **Step 1: Write the failing state mentally against the current UI**

Confirm the current render order shows summary first and lacks badges for missing PIC/deadline, which does not meet the approved design.

- [ ] **Step 2: Write minimal implementation**

Update local TypeScript shapes, derive operational counters, render `keyPoints` near the top, keep the action-items section first among operational sections, add open issues, show missing-field badges, and move participants/agenda below the action-oriented sections.

- [ ] **Step 3: Run the frontend verification**

Run: `npm run build`
Expected: PASS with the updated type shape and component render path.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/meeting-intelligence-workspace.tsx
git commit -m "feat: make meeting minutes output action first"
```

### Task 3: Verify End-to-End Safety

**Files:**
- Modify: `backend/internal/usecase/ai/minutes_test.go`
- Modify: `frontend/src/components/meeting-intelligence-workspace.tsx`

- [ ] **Step 1: Add or refine a regression test**

Cover a payload with empty `pic`, empty `deadline`, and `needsConfirmation` to ensure the frontend can still render actionable labels without crashing.

- [ ] **Step 2: Run backend tests**

Run: `go test ./internal/usecase/ai -v`
Expected: PASS

- [ ] **Step 3: Run frontend build again**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/internal/usecase/ai/minutes_test.go frontend/src/components/meeting-intelligence-workspace.tsx
git commit -m "test: verify meeting minutes operational fallback"
```
