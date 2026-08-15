package http

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/usecase/workingpaper"
)

type handlerCreateRiskRepo struct {
	gotOrgIDs []uuid.UUID
	risk      *entity.Risk
}

func (r *handlerCreateRiskRepo) Create(context.Context, *entity.Risk) error { return nil }

func (r *handlerCreateRiskRepo) GetByID(_ context.Context, _ uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	r.gotOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return r.risk, nil
}

func (r *handlerCreateRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *handlerCreateRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *handlerCreateRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) ListRegister(context.Context, repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}
func (r *handlerCreateRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *handlerCreateRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *handlerCreateRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}
func (r *handlerCreateRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

type handlerCreateWorkingPaperRepo struct {
	created             *entity.WorkingPaper
	listOrgIDs          []uuid.UUID
	listStatus          string
	listQuery           string
	listAssessmentCycle string
	listPage            int
	listLimit           int
	listItems           []*entity.WorkingPaper
	listTotal           int
}

func (r *handlerCreateWorkingPaperRepo) Create(_ context.Context, wp *entity.WorkingPaper) error {
	r.created = wp
	return nil
}
func (r *handlerCreateWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *handlerCreateWorkingPaperRepo) List(_ context.Context, orgIDs []uuid.UUID, status, query, assessmentCycle, createdAt string, page, limit int) ([]*entity.WorkingPaper, int, error) {
	r.listOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	r.listStatus = status
	r.listQuery = query
	r.listAssessmentCycle = assessmentCycle
	_ = createdAt
	r.listPage = page
	r.listLimit = limit
	return r.listItems, r.listTotal, nil
}
func (r *handlerCreateWorkingPaperRepo) Update(context.Context, *entity.WorkingPaper) error {
	return nil
}
func (r *handlerCreateWorkingPaperRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *handlerCreateWorkingPaperRepo) MutateByIDForUpdate(context.Context, uuid.UUID, func(*entity.WorkingPaper) error) (*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *handlerCreateWorkingPaperRepo) GetSignatoriesByWorkingPaperID(context.Context, uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	return nil, nil
}
func (r *handlerCreateWorkingPaperRepo) UpdateSignatory(context.Context, *entity.WorkingPaperSignatory) error {
	return nil
}
func (r *handlerCreateWorkingPaperRepo) GetPendingSigningByUserID(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *handlerCreateWorkingPaperRepo) CountPendingSigningByUserID(context.Context, uuid.UUID) (int, error) {
	return 0, nil
}
func (r *handlerCreateWorkingPaperRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) {
	return false, nil
}

func (r *handlerCreateWorkingPaperRepo) CountByOrgAndCycle(context.Context, uuid.UUID, string) (int, error) {
	return 0, nil
}

func (r *handlerCreateWorkingPaperRepo) PreviewPeriodRoster(context.Context, uuid.UUID, string) (*entity.WorkingPaperRosterPreview, error) {
	return nil, nil
}
func (r *handlerCreateWorkingPaperRepo) CreateWithPeriodRoster(context.Context, *entity.WorkingPaper, string, []entity.WorkingPaperRosterDecision) error {
	return nil
}
func (r *handlerCreateWorkingPaperRepo) ListSigningBlockers(context.Context, uuid.UUID) ([]entity.WorkingPaperSigningBlocker, error) {
	return nil, nil
}

var _ repository.WorkingPaperRepository = (*handlerCreateWorkingPaperRepo)(nil)

func TestWorkingPaperCreatePassesFullAccessibleOrgScope(t *testing.T) {
	orgOne := uuid.New()
	orgTwo := uuid.New()
	riskID := uuid.New()
	userID := uuid.New()
	riskRepo := &handlerCreateRiskRepo{risk: &entity.Risk{
		ID:             riskID,
		Status:         entity.RiskStatusApproved,
		IsCurrent:      true,
		VersionGroupID: uuid.New(),
		OrganizationID: &orgTwo,
		Code:           "R-501",
		Title:          "Gangguan logistik",
		Category:       entity.RiskCategoryOperasional,
		Probability:    4,
		Impact:         4,
		Weight:         entity.GetBobot(4, 4),
	}}
	wpRepo := &handlerCreateWorkingPaperRepo{}
	handler := NewWorkingPaperHandler(workingpaper.NewWorkingPaperUseCase(wpRepo, riskRepo, nil), wpRepo)

	body, err := json.Marshal(map[string]any{
		"title":            "KK Semester I",
		"assessment_cycle": "2026-Q2",
		"roster_revision":  "rev-1",
		"roster_decisions": []map[string]any{{
			"version_group_id": riskRepo.risk.VersionGroupID.String(),
			"included":         true,
		}},
		"risks": []map[string]any{{
			"risk_id":     riskID.String(),
			"source_mode": "latest_approved",
		}},
		"signatories": []map[string]any{{
			"user_id":        uuid.New().String(),
			"sequence_no":    1,
			"signer_name":    "Rina",
			"signer_nip":     "",
			"signer_pangkat": "Pembina Tk. I (IV/b)",
		}},
	})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}

	app := fiber.New()
	app.Post("/working-papers", func(c *fiber.Ctx) error {
		c.Locals("userId", userID)
		c.Locals("accessScope", &entity.AccessScope{AccessibleOrgIDs: []uuid.UUID{orgOne, orgTwo}})
		return c.Next()
	}, handler.Create)

	req := httptest.NewRequest(fiber.MethodPost, "/working-papers", bytes.NewReader(body))
	req.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusCreated {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 201, got %d: %s", resp.StatusCode, payload)
	}
}

func TestWorkingPaperListSupportsDynamicFiltersAndClampsPagination(t *testing.T) {
	orgOne := uuid.New()
	orgTwo := uuid.New()
	wpRepo := &handlerCreateWorkingPaperRepo{}
	handler := NewWorkingPaperHandler(workingpaper.NewWorkingPaperUseCase(wpRepo, nil, nil), wpRepo)

	app := fiber.New()
	app.Get("/working-papers", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{AccessibleOrgIDs: []uuid.UUID{orgOne, orgTwo}})
		return c.Next()
	}, handler.List)

	req := httptest.NewRequest(
		fiber.MethodGet,
		"/working-papers?status=signing&q=semester&assessment_cycle=2026-Q2&page=0&limit=250",
		nil,
	)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, payload)
	}

	if len(wpRepo.listOrgIDs) != 2 || wpRepo.listOrgIDs[0] != orgOne || wpRepo.listOrgIDs[1] != orgTwo {
		t.Fatalf("expected full scope [%s %s], got %v", orgOne, orgTwo, wpRepo.listOrgIDs)
	}
	if wpRepo.listStatus != "signing" {
		t.Fatalf("expected status signing, got %q", wpRepo.listStatus)
	}
	if wpRepo.listQuery != "semester" {
		t.Fatalf("expected q semester, got %q", wpRepo.listQuery)
	}
	if wpRepo.listAssessmentCycle != "2026-Q2" {
		t.Fatalf("expected assessment cycle 2026-Q2, got %q", wpRepo.listAssessmentCycle)
	}
	if wpRepo.listPage != 1 {
		t.Fatalf("expected clamped page 1, got %d", wpRepo.listPage)
	}
	if wpRepo.listLimit != 100 {
		t.Fatalf("expected clamped limit 100, got %d", wpRepo.listLimit)
	}

	var payload struct {
		Data  []map[string]any `json:"data"`
		Total int              `json:"total"`
		Page  int              `json:"page"`
		Limit int              `json:"limit"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data == nil {
		t.Fatal("expected non-nil data array")
	}
	if len(payload.Data) != 0 {
		t.Fatalf("expected empty data array, got %d items", len(payload.Data))
	}
	if payload.Total != 0 {
		t.Fatalf("expected total 0, got %d", payload.Total)
	}
	if payload.Page != 1 {
		t.Fatalf("expected response page 1, got %d", payload.Page)
	}
	if payload.Limit != 100 {
		t.Fatalf("expected response limit 100, got %d", payload.Limit)
	}
}

func TestHandleWPErrorReturnsStructuredMonitoringConflict(t *testing.T) {
	app := fiber.New()
	app.Get("/working-papers", func(c *fiber.Ctx) error {
		return handleWPError(c, &domainerrors.AppError{
			Code:    "MONITORING_INCOMPLETE",
			Message: "monitoring must be finalized before signing",
			Details: []entity.WorkingPaperSigningBlocker{{Code: "R-001", Title: "Gangguan server", MonitoringStatus: "draft"}},
		})
	})

	req := httptest.NewRequest(fiber.MethodGet, "/working-papers", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusConflict {
		t.Fatalf("expected 409 conflict, got %d", resp.StatusCode)
	}

	var payload struct {
		Type    string                              `json:"type"`
		Title   string                              `json:"title"`
		Detail  string                              `json:"detail"`
		Details []entity.WorkingPaperSigningBlocker `json:"details"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Type != "https://api.manris.com/errors/monitoring-incomplete" {
		t.Fatalf("unexpected type %q", payload.Type)
	}
	if payload.Title != "Pemantauan Belum Lengkap" {
		t.Fatalf("unexpected title %q", payload.Title)
	}
	if payload.Detail == "" {
		t.Fatal("expected detail text")
	}
	if len(payload.Details) != 1 || payload.Details[0].Code != "R-001" {
		t.Fatalf("unexpected details payload %#v", payload.Details)
	}
}
