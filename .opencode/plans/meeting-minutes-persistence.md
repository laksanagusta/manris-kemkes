# Meeting Minutes Persistence & Risk Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simpan notulen rapat ke database dan relasikan dengan risiko, sehingga muncul di tab Log & Komunikasi dengan tampilan ringkas + link ke halaman detail.

**Architecture:** 
- Backend: New entity `MeetingMinute` + junction table `meeting_minutes_risks` (many-to-many)
- Clean Architecture: Entity → Repository → UseCase → Handler
- Frontend: New detail page `/minutes/[id]`, modify Log & Komunikasi to show linked minutes, modify minutes generation to save with risk linking

**Tech Stack:** Go 1.25+ (backend), Fiber, PostgreSQL, Next.js 16, React 19, TypeScript

---

## File Structure

```
backend/
├── db/migrations/
│   └── 000003_meeting_minutes.up.sql      # CREATE meeting_minutes, meeting_minutes_risks
├── internal/
│   ├── domain/
│   │   ├── entity/
│   │   │   └── meeting_minute.go          # NEW: MeetingMinute, MeetingMinutesRisk
│   │   └── repository/
│   │       └── meeting_minute.go          # NEW: MeetingMinuteRepository interface
│   ├── repository/
│   │   └── postgres/
│   │       └── meeting_minute.go          # NEW: PostgreSQL implementation
│   ├── usecase/
│   │   └── meeting_minute/
│   │       ├── create.go                  # NEW: Create meeting minute
│   │       ├── get.go                     # NEW: Get by ID
│   │       ├── list.go                    # NEW: List with filters
│   │       └── link_risks.go              # NEW: Link/unlink risks
│   └── handler/http/
│       └── meeting_minute.go              # NEW: HTTP handlers

frontend/src/
├── types/
│   └── meeting-minute.ts                  # NEW: TypeScript types
├── lib/
│   └── meeting-minutes.ts                 # NEW: API client functions
├── app/(app)/
│   └── minutes/
│       └── [id]/
│           └── page.tsx                   # NEW: Meeting minute detail page
└── components/
    ├── meeting-intelligence-workspace.tsx # MODIFY: Add save dialog
    └── risk/
        └── risk-log-timeline.tsx         # MODIFY: Show linked minutes
```

---

## Task 1: Database Migration - Create Tables

**Files:**
- Create: `backend/db/migrations/000003_meeting_minutes.up.sql`

```sql
-- Meeting minutes table
CREATE TABLE IF NOT EXISTS meeting_minutes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    date            DATE NOT NULL,
    participants    TEXT[] DEFAULT '{}',
    agenda          TEXT[] DEFAULT '{}',
    summary         TEXT DEFAULT '',
    key_points      TEXT[] DEFAULT '{}',
    decisions       TEXT[] DEFAULT '{}',
    open_issues     TEXT[] DEFAULT '{}',
    action_items    JSONB DEFAULT '[]'::jsonb,
    next_check_in   DATE,
    transcript      TEXT DEFAULT '',
    organization_id UUID REFERENCES organizations(id),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS meeting_minutes_risks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id      UUID NOT NULL REFERENCES meeting_minutes(id) ON DELETE CASCADE,
    risk_id         UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    linked_by       UUID REFERENCES users(id),
    linked_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(meeting_id, risk_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_org ON meeting_minutes(organization_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_created_by ON meeting_minutes(created_by);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_date ON meeting_minutes(date DESC);
CREATE INDEX IF NOT EXISTS idx_mm_risks_meeting ON meeting_minutes_risks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_mm_risks_risk ON meeting_minutes_risks(risk_id);
```

- [ ] **Step 1: Create migration file**

Create file `backend/db/migrations/000003_meeting_minutes.up.sql` with the SQL above.

- [ ] **Step 2: Run migration**

```bash
cd backend && make migrate-up
```

Expected: Migration successful

---

## Task 2: Domain Entity & Repository Interface

**Files:**
- Create: `backend/internal/domain/entity/meeting_minute.go`
- Create: `backend/internal/domain/repository/meeting_minute.go`

### Entity Definition

```go
// internal/domain/entity/meeting_minute.go
package entity

import (
    "time"

    "github.com/google/uuid"
)

type ActionItem struct {
    Task              string   `json:"task"`
    PIC               string   `json:"pic"`
    OwnerUnit         string   `json:"ownerUnit,omitempty"`
    Deadline          string   `json:"deadline"`
    Priority          string   `json:"priority"`
    Status            string   `json:"status,omitempty"`
    Notes             string   `json:"notes,omitempty"`
    RelatedDecision   string   `json:"relatedDecision,omitempty"`
    NeedsConfirmation []string `json:"needsConfirmation,omitempty"`
}

type MeetingMinute struct {
    ID             uuid.UUID   `json:"id"`
    Title          string      `json:"title"`
    Date           time.Time   `json:"date"`
    Participants   []string    `json:"participants"`
    Agenda         []string    `json:"agenda"`
    Summary        string      `json:"summary"`
    KeyPoints      []string    `json:"keyPoints"`
    Decisions      []string    `json:"decisions"`
    OpenIssues     []string    `json:"openIssues"`
    ActionItems    []ActionItem `json:"actionItems"`
    NextCheckIn    *time.Time  `json:"nextCheckIn,omitempty"`
    Transcript     string      `json:"transcript"`
    OrganizationID *uuid.UUID  `json:"organizationId,omitempty"`
    CreatedBy      uuid.UUID   `json:"createdBy"`
    CreatedByName  string      `json:"createdByName"`
    CreatedAt      time.Time   `json:"createdAt"`
    UpdatedAt      time.Time  `json:"updatedAt"`
}

type MeetingMinutesRisk struct {
    ID            uuid.UUID `json:"id"`
    MeetingID     uuid.UUID `json:"meetingId"`
    RiskID        uuid.UUID `json:"riskId"`
    RiskCode      string    `json:"riskCode,omitempty"`
    RiskTitle     string    `json:"riskTitle,omitempty"`
    LinkedBy      uuid.UUID `json:"linkedBy"`
    LinkedByName  string    `json:"linkedByName,omitempty"`
    LinkedAt      time.Time `json:"linkedAt"`
}

type CreateMeetingMinuteInput struct {
    Title          string
    Date           time.Time
    Participants   []string
    Agenda         []string
    Summary        string
    KeyPoints      []string
    Decisions      []string
    OpenIssues     []string
    ActionItems    []ActionItem
    NextCheckIn    *time.Time
    Transcript     string
    OrganizationID *uuid.UUID
    CreatedBy      uuid.UUID
    RiskIDs        []uuid.UUID // Optional: link risks immediately
}

type MeetingMinuteWithRisks struct {
    MeetingMinute
    LinkedRisks []MeetingMinutesRisk `json:"linkedRisks"`
}
```

### Repository Interface

```go
// internal/domain/repository/meeting_minute.go
package repository

import (
    "context"

    "github.com/google/uuid"
    "github.com/manris/backend/internal/domain/entity"
)

type MeetingMinuteRepository interface {
    Create(ctx context.Context, input entity.CreateMeetingMinuteInput) (*entity.MeetingMinute, error)
    GetByID(ctx context.Context, id uuid.UUID) (*entity.MeetingMinuteWithRisks, error)
    List(ctx context.Context, opts ListMeetingMinutesOptions) ([]entity.MeetingMinute, int, error)
    ListByRiskID(ctx context.Context, riskID uuid.UUID) ([]entity.MeetingMinutesRisk, error)
    LinkRisks(ctx context.Context, meetingID uuid.UUID, riskIDs []uuid.UUID, linkedBy uuid.UUID) error
    UnlinkRisks(ctx context.Context, meetingID uuid.UUID, riskIDs []uuid.UUID) error
}

type ListMeetingMinutesOptions struct {
    OrganizationID *uuid.UUID
    CreatedBy      *uuid.UUID
    RiskID         *uuid.UUID
    Limit          int
    Offset         int
}
```

- [ ] **Step 1: Create entity file**

Create `backend/internal/domain/entity/meeting_minute.go` with the entity definitions above.

- [ ] **Step 2: Create repository interface**

Create `backend/internal/domain/repository/meeting_minute.go` with the interface above.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/domain/entity/meeting_minute.go backend/internal/domain/repository/meeting_minute.go
git commit -m "feat(domain): add meeting minute entity and repository interface"
```

---

## Task 3: PostgreSQL Repository Implementation

**Files:**
- Create: `backend/internal/repository/postgres/meeting_minute.go`

Key implementation points:
1. `Create` - Insert meeting minute + optional risk linking in transaction
2. `GetByID` - Fetch meeting minute with linked risks
3. `ListByRiskID` - Fetch all minutes linked to a specific risk (for Log & Komunikasi)
4. `LinkRisks` / `UnlinkRisks` - Manage many-to-many relationships

- [ ] **Step 1: Create repository implementation**

Create `backend/internal/repository/postgres/meeting_minute.go` with full CRUD operations.

- [ ] **Step 2: Run tests**

```bash
cd backend && go test ./internal/repository/postgres/... -v
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/repository/postgres/meeting_minute.go
git commit -m "feat(repo): add meeting minute postgres repository"
```

---

## Task 4: UseCase Layer

**Files:**
- Create: `backend/internal/usecase/meeting_minute/create.go`
- Create: `backend/internal/usecase/meeting_minute/get.go`
- Create: `backend/internal/usecase/meeting_minute/list.go`
- Create: `backend/internal/usecase/meeting_minute/link_risks.go`

Key use cases:
1. `Create` - Create meeting minute with optional risk links
2. `Get` - Fetch single meeting minute by ID with linked risks
3. `List` - List meeting minutes with pagination + filter by org/risk
4. `LinkRisks` - Add risk associations to existing meeting minute
5. `UnlinkRisks` - Remove risk associations

- [ ] **Step 1: Create usecase files**

Create all four usecase files.

- [ ] **Step 2: Commit**

```bash
git add backend/internal/usecase/meeting_minute/
git commit -m "feat(usecase): add meeting minute usecases"
```

---

## Task 5: HTTP Handler & Routes

**Files:**
- Create: `backend/internal/handler/http/meeting_minute.go`
- Modify: `backend/cmd/server/main.go`

### Endpoints

```
POST   /api/v1/meeting-minutes           # Create meeting minute
GET    /api/v1/meeting-minutes/:id       # Get meeting minute by ID
GET    /api/v1/meeting-minutes           # List meeting minutes (with filters)
POST   /api/v1/meeting-minutes/:id/risks # Link risks
DELETE /api/v1/meeting-minutes/:id/risks # Unlink risks
GET    /api/v1/risks/:riskId/meeting-minutes # Get minutes by risk (for Log & Komunikasi)
```

- [ ] **Step 1: Create handler file**

Create `backend/internal/handler/http/meeting_minute.go` with the implementation.

- [ ] **Step 2: Modify main.go**

Add repository, usecase, handler initialization and routes.

- [ ] **Step 3: Build and test**

```bash
cd backend && go build ./cmd/server/
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/handler/http/meeting_minute.go backend/cmd/server/main.go
git commit -m "feat(handler): add meeting minute HTTP handler and routes"
```

---

## Task 6: Frontend Types & API Client

**Files:**
- Create: `frontend/src/types/meeting-minute.ts`
- Create: `frontend/src/lib/meeting-minutes.ts`

- [ ] **Step 1: Create types file**

Create `frontend/src/types/meeting-minute.ts` with TypeScript interfaces.

- [ ] **Step 2: Create API client file**

Create `frontend/src/lib/meeting-minutes.ts` with API functions:
- `createMeetingMinute`
- `getMeetingMinute`
- `listMeetingMinutes`
- `linkRisksToMeetingMinute`
- `unlinkRisksFromMeetingMinute`
- `getMeetingMinutesByRisk`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/meeting-minute.ts frontend/src/lib/meeting-minutes.ts
git commit -m "feat(frontend): add meeting minute types and API client"
```

---

## Task 7: Modify Minutes Generation to Save with Risk Linking

**Files:**
- Modify: `frontend/src/components/meeting-intelligence-workspace.tsx`

Key changes:
1. Add state for saved minutes ID
2. Add "Simpan Notulen" button after minutes are generated
3. Create a save dialog that:
   - Shows AI-suggested risks (from transcript analysis)
   - Allows manual risk search/selection
   - Saves to backend with linked risks

- [ ] **Step 1: Add save dialog UI**

Add the save dialog component after the minutes display section.

- [ ] **Step 2: Add save state and handlers**

Add state variables and handler functions.

- [ ] **Step 3: Update buttons**

Add "Simpan Notulen" button in the minutes card header.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/meeting-intelligence-workspace.tsx
git commit -m "feat(frontend): add save minutes dialog with risk linking"
```

---

## Task 8: Create Meeting Minute Detail Page

**Files:**
- Create: `frontend/src/app/(app)/minutes/[id]/page.tsx`

Page shows:
- Full meeting minute details
- Linked risks with links to risk detail pages
- Action items, decisions, key points

- [ ] **Step 1: Create detail page**

Create `frontend/src/app/(app)/minutes/[id]/page.tsx`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/\(app\)/minutes/
git commit -m "feat(frontend): add meeting minute detail page"
```

---

## Task 9: Modify Log & Komunikasi to Show Linked Minutes

**Files:**
- Modify: `frontend/src/components/risk/risk-log-timeline.tsx`
- Add backend endpoint: `GET /risks/:riskId/meeting-minutes`

Changes:
1. Add backend endpoint to get meeting minutes by risk ID
2. Fetch linked meeting minutes for the risk
3. Add new timeline item type `meeting_minute`
4. Show summary + link to detail page in timeline

- [ ] **Step 1: Add backend endpoint**

Add `GetMeetingMinutes` handler in risk handler.

- [ ] **Step 2: Update timeline types and fetch data**

Add meeting minutes to the timeline data fetch.

- [ ] **Step 3: Update timeline rendering**

Add meeting_minute type to the timeline rendering with calendar icon.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/handler/http/risk.go frontend/src/components/risk/risk-log-timeline.tsx
git commit -m "feat: show linked meeting minutes in risk log timeline"
```

---

## Task 10: Integration Testing

- [ ] **Step 1: Test migration**

```bash
cd backend && make migrate-up && make migrate-down && make migrate-up
```

- [ ] **Step 2: Test API endpoints**

1. Create meeting minute with risk links
2. Get meeting minute by ID
3. List meeting minutes
4. Link/unlink risks
5. Get meeting minutes by risk ID

- [ ] **Step 3: Test frontend flow**

1. Generate minutes from transcript
2. Save minutes with risk links
3. View minutes detail page
4. Check minutes appear in risk log timeline

- [ ] **Step 4: Build and verify**

```bash
cd backend && go build ./cmd/server/
cd frontend && npm run build
```

---

## Summary

This plan implements:

1. **Database**: `meeting_minutes` + `meeting_minutes_risks` junction table
2. **Backend**: Full Clean Architecture stack (Entity → Repository → UseCase → Handler)
3. **Frontend**: 
   - Save minutes dialog with risk linking (AI suggests + manual selection)
   - Meeting minute detail page `/minutes/[id]`
   - Integration with Log & Komunikasi tab showing linked minutes

**Key Features:**
- Many-to-many relationship between meeting minutes and risks
- AI-suggested risk linking when saving minutes
- Manual risk search/selection in save dialog
- Minutes appear in risk timeline with summary + link to detail
- Dedicated detail page for full minutes view

**Estimated effort:** ~4-6 hours for complete implementation