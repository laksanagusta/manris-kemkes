// Package usecase_test provides a cross-domain RBAC regression matrix that proves
// organization isolation across all protected domains. Every protected domain is
// listed explicitly so that future contributors can detect a missing org-scope
// hook quickly.
package usecase_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"

	"github.com/manris/backend/internal/usecase/control"
	"github.com/manris/backend/internal/usecase/form"
	"github.com/manris/backend/internal/usecase/incident"
	"github.com/manris/backend/internal/usecase/kri"
	"github.com/manris/backend/internal/usecase/lesson"
	"github.com/manris/backend/internal/usecase/meeting_minute"
	"github.com/manris/backend/internal/usecase/report"
	"github.com/manris/backend/internal/usecase/risk"
)

// ---------------------------------------------------------------------------
// Shared org fixtures
// ---------------------------------------------------------------------------

var (
	orgAlpha  = uuid.New() // Owner org (user's home)
	orgBeta   = uuid.New() // Sibling org (must be denied)
	orgChild  = uuid.New() // Descendant of orgAlpha (read-only, no write)
	entityID  = uuid.New() // Shared entity ID for detail tests
	entityID2 = uuid.New() // Second entity ID
	fixedTime = time.Now()
)

func ptrUUID(u uuid.UUID) *uuid.UUID { return &u }

// ---------------------------------------------------------------------------
// Noop base repos — satisfy every interface method with zero-value returns.
// Scoped wrappers embed these and override only GetByID / List as needed.
// ---------------------------------------------------------------------------

// --- RiskRepository noop ---

type noopRiskRepo struct{}

func (r *noopRiskRepo) Create(context.Context, *entity.Risk) error { return nil }
func (r *noopRiskRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.Risk, error) {
	return nil, fmt.Errorf("not found")
}
func (r *noopRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *noopRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *noopRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *noopRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *noopRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *noopRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *noopRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *noopRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *noopRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *noopRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *noopRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *noopRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *noopRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *noopRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) {
	return nil, nil
}
func (r *noopRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *noopRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *noopRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *noopRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *noopRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *noopRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

// --- IncidentRepository noop ---

type noopIncidentRepo struct{}

func (r *noopIncidentRepo) Create(context.Context, *entity.Incident) error { return nil }
func (r *noopIncidentRepo) GetByID(context.Context, string, []uuid.UUID) (*entity.Incident, error) {
	return nil, fmt.Errorf("not found")
}
func (r *noopIncidentRepo) Update(context.Context, *entity.Incident) error { return nil }
func (r *noopIncidentRepo) Delete(context.Context, string) error           { return nil }
func (r *noopIncidentRepo) List(context.Context, []uuid.UUID) ([]*entity.Incident, error) {
	return nil, nil
}
func (r *noopIncidentRepo) GetSummary(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return nil, nil
}

// --- ControlRepository noop ---

type noopControlRepo struct{}

func (r *noopControlRepo) Create(context.Context, *entity.Control) error { return nil }
func (r *noopControlRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.Control, error) {
	return nil, fmt.Errorf("not found")
}
func (r *noopControlRepo) Update(context.Context, *entity.Control) error { return nil }
func (r *noopControlRepo) Delete(context.Context, uuid.UUID) error       { return nil }
func (r *noopControlRepo) List(context.Context, []uuid.UUID) ([]*entity.Control, error) {
	return nil, nil
}
func (r *noopControlRepo) GetDashboard(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return nil, nil
}

// --- KRIRepository noop ---

type noopKRIRepo struct{}

func (r *noopKRIRepo) Create(context.Context, *entity.KRI) error { return nil }
func (r *noopKRIRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.KRI, error) {
	return nil, fmt.Errorf("not found")
}
func (r *noopKRIRepo) Update(context.Context, *entity.KRI) error        { return nil }
func (r *noopKRIRepo) Delete(context.Context, uuid.UUID) error          { return nil }
func (r *noopKRIRepo) Archive(context.Context, uuid.UUID, string) error { return nil }
func (r *noopKRIRepo) List(context.Context, []uuid.UUID, bool) ([]*entity.KRI, error) {
	return nil, nil
}
func (r *noopKRIRepo) GetDashboard(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return nil, nil
}

// --- LessonRepository noop ---

type noopLessonRepo struct{}

func (r *noopLessonRepo) Create(context.Context, *entity.Lesson) error { return nil }
func (r *noopLessonRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.Lesson, error) {
	return nil, fmt.Errorf("not found")
}
func (r *noopLessonRepo) Update(context.Context, *entity.Lesson) error { return nil }
func (r *noopLessonRepo) Delete(context.Context, uuid.UUID) error      { return nil }
func (r *noopLessonRepo) List(context.Context, []uuid.UUID) ([]*entity.Lesson, error) {
	return nil, nil
}
func (r *noopLessonRepo) GetDashboard(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return nil, nil
}

// --- FormRepository noop ---

type noopFormRepo struct{}

func (r *noopFormRepo) Create(context.Context, *entity.Form) (*entity.Form, error) { return nil, nil }
func (r *noopFormRepo) GetByID(context.Context, uuid.UUID) (*entity.Form, error) {
	return nil, fmt.Errorf("not found")
}
func (r *noopFormRepo) Update(context.Context, *entity.Form) (*entity.Form, error) { return nil, nil }
func (r *noopFormRepo) Delete(context.Context, uuid.UUID) error                    { return nil }
func (r *noopFormRepo) List(context.Context, repository.FormListFilter) ([]*entity.Form, error) {
	return nil, nil
}
func (r *noopFormRepo) UpdateStatus(context.Context, uuid.UUID, string) error    { return nil }
func (r *noopFormRepo) HasResponses(context.Context, uuid.UUID) (bool, error)    { return false, nil }
func (r *noopFormRepo) GetResponseCount(context.Context, uuid.UUID) (int, error) { return 0, nil }

// --- FormAssignmentRepository noop ---

type noopFormAssignmentRepo struct{}

func (r *noopFormAssignmentRepo) SetAssignments(context.Context, uuid.UUID, []uuid.UUID) error {
	return nil
}
func (r *noopFormAssignmentRepo) GetByFormID(context.Context, uuid.UUID) ([]*entity.FormAssignment, error) {
	return nil, nil
}
func (r *noopFormAssignmentRepo) GetFormIDsForOrganization(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}

// --- MeetingMinuteRepository noop ---

type noopMeetingMinuteRepo struct{}

func (r *noopMeetingMinuteRepo) Create(context.Context, entity.CreateMeetingMinuteInput) (*entity.MeetingMinute, error) {
	return nil, nil
}
func (r *noopMeetingMinuteRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.MeetingMinuteWithRisks, error) {
	return nil, fmt.Errorf("not found")
}
func (r *noopMeetingMinuteRepo) List(context.Context, repository.ListMeetingMinutesOptions) ([]entity.MeetingMinute, int, error) {
	return nil, 0, nil
}
func (r *noopMeetingMinuteRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *noopMeetingMinuteRepo) ListByRiskID(context.Context, uuid.UUID) ([]entity.MeetingMinutesRisk, error) {
	return nil, nil
}
func (r *noopMeetingMinuteRepo) LinkRisks(context.Context, uuid.UUID, []uuid.UUID, uuid.UUID) error {
	return nil
}
func (r *noopMeetingMinuteRepo) UnlinkRisks(context.Context, uuid.UUID, []uuid.UUID) error {
	return nil
}

// ---------------------------------------------------------------------------
// Scoped wrapper repos — override GetByID with org-aware filtering.
// Simulates the real Postgres WHERE org_id = ANY($orgIDs) behaviour.
// ---------------------------------------------------------------------------

type scopedRiskRepo struct {
	noopRiskRepo
	item *entity.Risk
}

func (r *scopedRiskRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	if r.item == nil || r.item.ID != id {
		return nil, fmt.Errorf("not found")
	}
	if orgIDs != nil {
		for _, oid := range orgIDs {
			if r.item.OrganizationID != nil && oid == *r.item.OrganizationID {
				cp := *r.item
				return &cp, nil
			}
		}
		return nil, fmt.Errorf("not found")
	}
	cp := *r.item
	return &cp, nil
}

// Override ListCycleSnapshot for report tests.
func (r *scopedRiskRepo) ListCycleSnapshot(_ context.Context, _ string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	if r.item == nil {
		return nil, nil
	}
	if orgIDs != nil && r.item.OrganizationID != nil {
		for _, oid := range orgIDs {
			if oid == *r.item.OrganizationID {
				return []*entity.Risk{r.item}, nil
			}
		}
		return nil, nil
	}
	return []*entity.Risk{r.item}, nil
}

// Override ListApprovedRisks for report trend data.
func (r *scopedRiskRepo) ListApprovedRisks(_ context.Context, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	if r.item == nil {
		return nil, nil
	}
	if orgIDs != nil && r.item.OrganizationID != nil {
		for _, oid := range orgIDs {
			if oid == *r.item.OrganizationID {
				return []*entity.Risk{r.item}, nil
			}
		}
		return nil, nil
	}
	return []*entity.Risk{r.item}, nil
}

type scopedIncidentRepo struct {
	noopIncidentRepo
	item *entity.Incident
}

func (r *scopedIncidentRepo) GetByID(_ context.Context, id string, orgIDs []uuid.UUID) (*entity.Incident, error) {
	if r.item == nil || r.item.ID.String() != id {
		return nil, fmt.Errorf("not found")
	}
	if orgIDs != nil {
		for _, oid := range orgIDs {
			if r.item.OrganizationID != nil && oid == *r.item.OrganizationID {
				cp := *r.item
				return &cp, nil
			}
		}
		return nil, fmt.Errorf("not found")
	}
	cp := *r.item
	return &cp, nil
}

type scopedControlRepo struct {
	noopControlRepo
	item *entity.Control
}

func (r *scopedControlRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Control, error) {
	if r.item == nil || r.item.ID != id {
		return nil, fmt.Errorf("not found")
	}
	if orgIDs != nil {
		for _, oid := range orgIDs {
			if r.item.OrganizationID != nil && oid == *r.item.OrganizationID {
				cp := *r.item
				return &cp, nil
			}
		}
		return nil, fmt.Errorf("not found")
	}
	cp := *r.item
	return &cp, nil
}

type scopedKRIRepo struct {
	noopKRIRepo
	item *entity.KRI
}

func (r *scopedKRIRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.KRI, error) {
	if r.item == nil || r.item.ID != id {
		return nil, fmt.Errorf("not found")
	}
	if orgIDs != nil {
		for _, oid := range orgIDs {
			if r.item.OrganizationID != nil && oid == *r.item.OrganizationID {
				cp := *r.item
				return &cp, nil
			}
		}
		return nil, fmt.Errorf("not found")
	}
	cp := *r.item
	return &cp, nil
}

type scopedLessonRepo struct {
	noopLessonRepo
	item *entity.Lesson
}

func (r *scopedLessonRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Lesson, error) {
	if r.item == nil || r.item.ID != id {
		return nil, fmt.Errorf("not found")
	}
	if orgIDs != nil {
		for _, oid := range orgIDs {
			if r.item.OrganizationID != nil && oid == *r.item.OrganizationID {
				cp := *r.item
				return &cp, nil
			}
		}
		return nil, fmt.Errorf("not found")
	}
	cp := *r.item
	return &cp, nil
}

// Form: repo returns form unconditionally; scope check lives in use case via AccessScope.
type scopedFormRepo struct {
	noopFormRepo
	item *entity.Form
}

func (r *scopedFormRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Form, error) {
	if r.item == nil || r.item.ID != id {
		return nil, fmt.Errorf("not found")
	}
	cp := *r.item
	return &cp, nil
}

type scopedMeetingMinuteRepo struct {
	noopMeetingMinuteRepo
	item *entity.MeetingMinuteWithRisks
}

func (r *scopedMeetingMinuteRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.MeetingMinuteWithRisks, error) {
	if r.item == nil || r.item.ID != id {
		return nil, fmt.Errorf("not found")
	}
	if orgIDs != nil {
		for _, oid := range orgIDs {
			if r.item.OrganizationID != nil && oid == *r.item.OrganizationID {
				return r.item, nil
			}
		}
		return nil, fmt.Errorf("not found")
	}
	return r.item, nil
}

// ---------------------------------------------------------------------------
// Test 1: TestRBACMatrix_SiblingOrgDenied
//
// For every protected domain, proves that an entity owned by orgAlpha is NOT
// accessible when the caller's scope contains only orgBeta (a sibling).
// ---------------------------------------------------------------------------

func TestRBACMatrix_SiblingOrgDenied(t *testing.T) {
	ctx := context.Background()
	siblingOrgIDs := []uuid.UUID{orgBeta}

	t.Run("risk", func(t *testing.T) {
		repo := &scopedRiskRepo{item: &entity.Risk{
			ID: entityID, OrganizationID: ptrUUID(orgAlpha),
			Title: "R1", Probability: 3, Impact: 3, Category: "operasional",
		}}
		uc := risk.NewGetRiskUseCase(repo)
		_, err := uc.Execute(ctx, entityID, siblingOrgIDs)
		if err == nil {
			t.Fatal("expected error for sibling org access to risk, got nil")
		}
	})

	t.Run("incident", func(t *testing.T) {
		repo := &scopedIncidentRepo{item: &entity.Incident{
			ID: entityID, Title: "I1", OrganizationID: ptrUUID(orgAlpha),
		}}
		uc := incident.NewGetIncidentUseCase(repo)
		_, err := uc.Execute(ctx, entityID.String(), siblingOrgIDs)
		if err == nil {
			t.Fatal("expected error for sibling org access to incident, got nil")
		}
	})

	t.Run("control", func(t *testing.T) {
		repo := &scopedControlRepo{item: &entity.Control{
			ID: entityID, OrganizationID: ptrUUID(orgAlpha),
		}}
		uc := control.NewGetControlUseCase(repo)
		_, err := uc.Execute(ctx, entityID, siblingOrgIDs)
		if err == nil {
			t.Fatal("expected error for sibling org access to control, got nil")
		}
	})

	t.Run("kri", func(t *testing.T) {
		repo := &scopedKRIRepo{item: &entity.KRI{
			ID: entityID, OrganizationID: ptrUUID(orgAlpha),
		}}
		uc := kri.NewGetKRIUseCase(repo)
		_, err := uc.Execute(ctx, entityID, siblingOrgIDs)
		if err == nil {
			t.Fatal("expected error for sibling org access to KRI, got nil")
		}
	})

	t.Run("lesson", func(t *testing.T) {
		repo := &scopedLessonRepo{item: &entity.Lesson{
			ID: entityID, OrganizationID: ptrUUID(orgAlpha),
		}}
		uc := lesson.NewGetLessonUseCase(repo)
		_, err := uc.Execute(ctx, entityID, siblingOrgIDs)
		if err == nil {
			t.Fatal("expected error for sibling org access to lesson, got nil")
		}
	})

	t.Run("form", func(t *testing.T) {
		// Form scope check lives in use case, not repo.
		// A draft form owned by orgAlpha must not be visible to orgBeta.
		formRepo := &scopedFormRepo{item: &entity.Form{
			ID:             entityID,
			Title:          "F1",
			Status:         entity.FormStatusDraft,
			TargetAudience: "specific",
			OrganizationID: ptrUUID(orgAlpha),
			CreatedBy:      uuid.New(),
		}}
		assignRepo := &noopFormAssignmentRepo{}
		scope := &entity.AccessScope{
			UserID:           uuid.New(),
			Role:             "unit",
			OrganizationID:   ptrUUID(orgBeta),
			AccessibleOrgIDs: []uuid.UUID{orgBeta},
		}
		uc := form.NewGetFormUseCase(formRepo, assignRepo)
		_, err := uc.Execute(ctx, form.GetFormInput{
			FormID: entityID,
			Scope:  scope,
		})
		if err == nil {
			t.Fatal("expected error for sibling org access to form, got nil")
		}
	})

	t.Run("meeting_minute", func(t *testing.T) {
		repo := &scopedMeetingMinuteRepo{item: &entity.MeetingMinuteWithRisks{
			MeetingMinute: entity.MeetingMinute{
				ID: entityID, Title: "MM1", OrganizationID: ptrUUID(orgAlpha),
				CreatedBy: uuid.New(), Date: fixedTime,
			},
		}}
		uc := meeting_minute.NewGetMeetingMinuteUseCase(repo)
		_, err := uc.Execute(ctx, meeting_minute.GetInput{ID: entityID}, siblingOrgIDs)
		if err == nil {
			t.Fatal("expected error for sibling org access to meeting minute, got nil")
		}
	})

	t.Run("report", func(t *testing.T) {
		// Report aggregates risks, incidents, KRIs. If orgIDs contain only
		// orgBeta, but data belongs to orgAlpha, the report must see zero
		// risks and fail with not-found.
		riskRepo := &scopedRiskRepo{item: &entity.Risk{
			ID: entityID, OrganizationID: ptrUUID(orgAlpha),
			Title: "R1", Probability: 3, Impact: 3, Category: "operasional",
			AssessmentCycle: "2025-H1",
		}}
		incidentRepo := &noopIncidentRepo{}
		kriRepo := &noopKRIRepo{}
		uc := report.NewGenerateReportUseCase(riskRepo, incidentRepo, kriRepo)
		_, err := uc.Execute(ctx, report.GenerateReportInput{
			Cycle:  "2025-H1",
			OrgIDs: siblingOrgIDs,
		})
		if err == nil {
			t.Fatal("expected error for sibling org report generation, got nil")
		}
	})
}

// ---------------------------------------------------------------------------
// Test 2: TestRBACMatrix_ParentCanReadDescendantOnly
//
// A parent org (orgAlpha) whose AccessibleOrgIDs includes a child (orgChild)
// can READ entities owned by the child but CANNOT WRITE (CanWrite → false).
// ---------------------------------------------------------------------------

func TestRBACMatrix_ParentCanReadDescendantOnly(t *testing.T) {
	ctx := context.Background()
	parentScope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   ptrUUID(orgAlpha),
		AccessibleOrgIDs: []uuid.UUID{orgAlpha, orgChild},
	}
	readOrgIDs := parentScope.AccessibleOrgIDs

	t.Run("risk/read_allowed", func(t *testing.T) {
		repo := &scopedRiskRepo{item: &entity.Risk{
			ID: entityID, OrganizationID: ptrUUID(orgChild),
			Title: "R-child", Probability: 2, Impact: 2, Category: "operasional",
		}}
		uc := risk.NewGetRiskUseCase(repo)
		result, err := uc.Execute(ctx, entityID, readOrgIDs)
		if err != nil {
			t.Fatalf("parent should read child risk, got %v", err)
		}
		if result.ID != entityID {
			t.Fatalf("expected risk %s, got %s", entityID, result.ID)
		}
	})

	t.Run("risk/write_denied", func(t *testing.T) {
		if parentScope.CanWrite(orgChild) {
			t.Fatal("parent must NOT have write access to child org")
		}
	})

	t.Run("incident/read_allowed", func(t *testing.T) {
		repo := &scopedIncidentRepo{item: &entity.Incident{
			ID: entityID, Title: "I-child", OrganizationID: ptrUUID(orgChild),
		}}
		uc := incident.NewGetIncidentUseCase(repo)
		result, err := uc.Execute(ctx, entityID.String(), readOrgIDs)
		if err != nil {
			t.Fatalf("parent should read child incident, got %v", err)
		}
		if result.ID != entityID {
			t.Fatalf("expected incident %s, got %s", entityID, result.ID)
		}
	})

	t.Run("incident/write_denied", func(t *testing.T) {
		if parentScope.CanWrite(orgChild) {
			t.Fatal("parent must NOT have write access to child org")
		}
	})

	t.Run("control/read_allowed", func(t *testing.T) {
		repo := &scopedControlRepo{item: &entity.Control{
			ID: entityID, OrganizationID: ptrUUID(orgChild),
		}}
		uc := control.NewGetControlUseCase(repo)
		_, err := uc.Execute(ctx, entityID, readOrgIDs)
		if err != nil {
			t.Fatalf("parent should read child control, got %v", err)
		}
	})

	t.Run("kri/read_allowed", func(t *testing.T) {
		repo := &scopedKRIRepo{item: &entity.KRI{
			ID: entityID, OrganizationID: ptrUUID(orgChild),
		}}
		uc := kri.NewGetKRIUseCase(repo)
		_, err := uc.Execute(ctx, entityID, readOrgIDs)
		if err != nil {
			t.Fatalf("parent should read child KRI, got %v", err)
		}
	})

	t.Run("lesson/read_allowed", func(t *testing.T) {
		repo := &scopedLessonRepo{item: &entity.Lesson{
			ID: entityID, OrganizationID: ptrUUID(orgChild),
		}}
		uc := lesson.NewGetLessonUseCase(repo)
		_, err := uc.Execute(ctx, entityID, readOrgIDs)
		if err != nil {
			t.Fatalf("parent should read child lesson, got %v", err)
		}
	})

	t.Run("form/read_allowed", func(t *testing.T) {
		formRepo := &scopedFormRepo{item: &entity.Form{
			ID:             entityID,
			Title:          "F-child",
			Status:         entity.FormStatusDraft,
			TargetAudience: "specific",
			OrganizationID: ptrUUID(orgChild),
			CreatedBy:      uuid.New(),
		}}
		assignRepo := &noopFormAssignmentRepo{}
		uc := form.NewGetFormUseCase(formRepo, assignRepo)
		_, err := uc.Execute(ctx, form.GetFormInput{
			FormID: entityID,
			Scope:  parentScope,
		})
		if err != nil {
			t.Fatalf("parent should read child form, got %v", err)
		}
	})

	t.Run("meeting_minute/read_allowed", func(t *testing.T) {
		repo := &scopedMeetingMinuteRepo{item: &entity.MeetingMinuteWithRisks{
			MeetingMinute: entity.MeetingMinute{
				ID: entityID, Title: "MM-child", OrganizationID: ptrUUID(orgChild),
				CreatedBy: uuid.New(), Date: fixedTime,
			},
		}}
		uc := meeting_minute.NewGetMeetingMinuteUseCase(repo)
		_, err := uc.Execute(ctx, meeting_minute.GetInput{ID: entityID}, readOrgIDs)
		if err != nil {
			t.Fatalf("parent should read child meeting minute, got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// Test 3: TestRBACMatrix_OutOfScopeDetailReturnsNotFound
//
// When a user requests a detail for an entity outside their org scope, the
// use case should return a domain not-found error — NOT ErrForbidden.
// This prevents information leakage (attacker can't distinguish "exists but
// forbidden" from "does not exist").
// ---------------------------------------------------------------------------

func TestRBACMatrix_OutOfScopeDetailReturnsNotFound(t *testing.T) {
	ctx := context.Background()
	outOfScopeOrgIDs := []uuid.UUID{orgBeta}

	t.Run("risk", func(t *testing.T) {
		repo := &scopedRiskRepo{item: &entity.Risk{
			ID: entityID, OrganizationID: ptrUUID(orgAlpha),
			Title: "R1", Probability: 3, Impact: 3, Category: "operasional",
		}}
		uc := risk.NewGetRiskUseCase(repo)
		_, err := uc.Execute(ctx, entityID, outOfScopeOrgIDs)
		if err == nil {
			t.Fatal("expected not-found, got nil")
		}
		if domainerrors.IsForbidden(err) {
			t.Fatalf("expected not-found error, got forbidden: %v", err)
		}
	})

	t.Run("incident", func(t *testing.T) {
		repo := &scopedIncidentRepo{item: &entity.Incident{
			ID: entityID, Title: "I1", OrganizationID: ptrUUID(orgAlpha),
		}}
		uc := incident.NewGetIncidentUseCase(repo)
		_, err := uc.Execute(ctx, entityID.String(), outOfScopeOrgIDs)
		if err == nil {
			t.Fatal("expected not-found, got nil")
		}
		if domainerrors.IsForbidden(err) {
			t.Fatalf("expected not-found error, got forbidden: %v", err)
		}
	})

	t.Run("control", func(t *testing.T) {
		repo := &scopedControlRepo{item: &entity.Control{
			ID: entityID, OrganizationID: ptrUUID(orgAlpha),
		}}
		uc := control.NewGetControlUseCase(repo)
		_, err := uc.Execute(ctx, entityID, outOfScopeOrgIDs)
		if err == nil {
			t.Fatal("expected not-found, got nil")
		}
		if domainerrors.IsForbidden(err) {
			t.Fatalf("expected not-found error, got forbidden: %v", err)
		}
	})

	t.Run("kri", func(t *testing.T) {
		repo := &scopedKRIRepo{item: &entity.KRI{
			ID: entityID, OrganizationID: ptrUUID(orgAlpha),
		}}
		uc := kri.NewGetKRIUseCase(repo)
		_, err := uc.Execute(ctx, entityID, outOfScopeOrgIDs)
		if err == nil {
			t.Fatal("expected not-found, got nil")
		}
		if domainerrors.IsForbidden(err) {
			t.Fatalf("expected not-found error, got forbidden: %v", err)
		}
	})

	t.Run("lesson", func(t *testing.T) {
		repo := &scopedLessonRepo{item: &entity.Lesson{
			ID: entityID, OrganizationID: ptrUUID(orgAlpha),
		}}
		uc := lesson.NewGetLessonUseCase(repo)
		_, err := uc.Execute(ctx, entityID, outOfScopeOrgIDs)
		if err == nil {
			t.Fatal("expected not-found, got nil")
		}
		if domainerrors.IsForbidden(err) {
			t.Fatalf("expected not-found error, got forbidden: %v", err)
		}
	})

	t.Run("form", func(t *testing.T) {
		// Form returns ErrFormNotFound (which is a domain error, not ErrForbidden).
		formRepo := &scopedFormRepo{item: &entity.Form{
			ID:             entityID,
			Title:          "F1",
			Status:         entity.FormStatusDraft,
			TargetAudience: "specific",
			OrganizationID: ptrUUID(orgAlpha),
			CreatedBy:      uuid.New(),
		}}
		assignRepo := &noopFormAssignmentRepo{}
		scope := &entity.AccessScope{
			UserID:           uuid.New(),
			Role:             "unit",
			OrganizationID:   ptrUUID(orgBeta),
			AccessibleOrgIDs: []uuid.UUID{orgBeta},
		}
		uc := form.NewGetFormUseCase(formRepo, assignRepo)
		_, err := uc.Execute(ctx, form.GetFormInput{
			FormID: entityID,
			Scope:  scope,
		})
		if err == nil {
			t.Fatal("expected not-found, got nil")
		}
		if domainerrors.IsForbidden(err) {
			t.Fatalf("expected not-found error, got forbidden: %v", err)
		}
	})

	t.Run("meeting_minute", func(t *testing.T) {
		repo := &scopedMeetingMinuteRepo{item: &entity.MeetingMinuteWithRisks{
			MeetingMinute: entity.MeetingMinute{
				ID: entityID, Title: "MM1", OrganizationID: ptrUUID(orgAlpha),
				CreatedBy: uuid.New(), Date: fixedTime,
			},
		}}
		uc := meeting_minute.NewGetMeetingMinuteUseCase(repo)
		_, err := uc.Execute(ctx, meeting_minute.GetInput{ID: entityID}, outOfScopeOrgIDs)
		if err == nil {
			t.Fatal("expected not-found, got nil")
		}
		if domainerrors.IsForbidden(err) {
			t.Fatalf("expected not-found error, got forbidden: %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// Test 4: TestRBACMatrix_RejectsOutOfScopeOrgFilter
//
// Validates that AccessScope.NarrowToOrg returns ErrForbidden when the
// requested org is not in the user's accessible list.
// ---------------------------------------------------------------------------

func TestRBACMatrix_RejectsOutOfScopeOrgFilter(t *testing.T) {
	domains := []string{
		"risk", "incident", "control", "kri",
		"lesson", "form", "meeting_minute", "report",
	}

	for _, domain := range domains {
		t.Run(domain, func(t *testing.T) {
			scope := &entity.AccessScope{
				UserID:           uuid.New(),
				Role:             "unit",
				OrganizationID:   ptrUUID(orgAlpha),
				AccessibleOrgIDs: []uuid.UUID{orgAlpha},
			}

			// Try to narrow to orgBeta which is not accessible.
			_, err := scope.NarrowToOrg(orgBeta)
			if err == nil {
				t.Fatalf("[%s] NarrowToOrg should reject inaccessible org, got nil", domain)
			}
			if !domainerrors.IsForbidden(err) {
				t.Fatalf("[%s] expected ErrForbidden, got %v", domain, err)
			}

			// Verify own org succeeds.
			narrowed, err := scope.NarrowToOrg(orgAlpha)
			if err != nil {
				t.Fatalf("[%s] NarrowToOrg should allow own org, got %v", domain, err)
			}
			if len(narrowed) != 1 || narrowed[0] != orgAlpha {
				t.Fatalf("[%s] NarrowToOrg returned unexpected result: %v", domain, narrowed)
			}
		})
	}
}
