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
func (r *handlerCreateRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *handlerCreateRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *handlerCreateRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
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
func (r *handlerCreateRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) {
	return nil, nil
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
	created *entity.WorkingPaper
}

func (r *handlerCreateWorkingPaperRepo) Create(_ context.Context, wp *entity.WorkingPaper) error {
	r.created = wp
	return nil
}
func (r *handlerCreateWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *handlerCreateWorkingPaperRepo) List(context.Context, []uuid.UUID, string, int, int) ([]*entity.WorkingPaper, int, error) {
	return nil, 0, nil
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
	handler := NewWorkingPaperHandler(workingpaper.NewWorkingPaperUseCase(wpRepo, riskRepo), wpRepo)

	body, err := json.Marshal(map[string]any{
		"title":            "KK Semester I",
		"assessment_cycle": "2026-H1",
		"risk_source_mode": "latest_approved",
		"risk_ids":         []string{riskID.String()},
		"signatories": []map[string]any{{
			"user_id":           uuid.New().String(),
			"sequence_no":       1,
			"signer_name":       "Rina",
			"signer_nip":        "",
			"signer_title":      "Kabid",
			"signer_role_label": "Pemeriksa",
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
	if len(riskRepo.gotOrgIDs) != 2 {
		t.Fatalf("expected risk resolution with 2 org IDs, got %d", len(riskRepo.gotOrgIDs))
	}
	if riskRepo.gotOrgIDs[0] != orgOne || riskRepo.gotOrgIDs[1] != orgTwo {
		t.Fatalf("expected full scope [%s %s], got %v", orgOne, orgTwo, riskRepo.gotOrgIDs)
	}
}
