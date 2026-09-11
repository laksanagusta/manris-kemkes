package http

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainrepo "github.com/manris/backend/internal/domain/repository"
	riskcharteruc "github.com/manris/backend/internal/usecase/riskcharter"
)

type handlerRiskCharterRepo struct {
	created *entity.RiskCharter
	items   map[uuid.UUID]*entity.RiskCharter
}

func (s *handlerRiskCharterRepo) Create(_ context.Context, charter *entity.RiskCharter) error {
	if charter.ID == uuid.Nil {
		charter.ID = uuid.New()
	}
	now := time.Now()
	if charter.CreatedAt.IsZero() {
		charter.CreatedAt = now
	}
	charter.UpdatedAt = charter.CreatedAt
	s.created = charter
	if s.items == nil {
		s.items = map[uuid.UUID]*entity.RiskCharter{}
	}
	s.items[charter.ID] = charter
	return nil
}

func (s *handlerRiskCharterRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.RiskCharter, error) {
	if item, ok := s.items[id]; ok {
		return item, nil
	}
	return nil, fiber.ErrNotFound
}

func (s *handlerRiskCharterRepo) UpdateDraft(_ context.Context, charter *entity.RiskCharter) error {
	if s.items == nil {
		s.items = map[uuid.UUID]*entity.RiskCharter{}
	}
	charter.UpdatedAt = time.Now()
	s.items[charter.ID] = charter
	return nil
}

func (s *handlerRiskCharterRepo) List(_ context.Context, _ domainrepo.RiskCharterListFilter) ([]*entity.RiskCharter, int, error) {
	items := make([]*entity.RiskCharter, 0, len(s.items))
	for _, item := range s.items {
		items = append(items, item)
	}
	return items, len(items), nil
}

func (s *handlerRiskCharterRepo) FindExistingByOrgPeriodLevel(_ context.Context, _ uuid.UUID, _ string, _ string) (*entity.RiskCharter, error) {
	return nil, nil
}

func (s *handlerRiskCharterRepo) Finalize(_ context.Context, charter *entity.RiskCharter) error {
	charter.Status = entity.RiskCharterStatusActive
	return nil
}

func (s *handlerRiskCharterRepo) CreateRevision(_ context.Context, _ *entity.RiskCharter, revision *entity.RiskCharter) error {
	return s.Create(context.Background(), revision)
}

func (s *handlerRiskCharterRepo) ListVersions(_ context.Context, _ uuid.UUID) ([]*entity.RiskCharter, error) {
	items, _, err := s.List(context.Background(), domainrepo.RiskCharterListFilter{})
	return items, err
}

func (s *handlerRiskCharterRepo) Archive(_ context.Context, id uuid.UUID) error {
	s.items[id].Status = entity.RiskCharterStatusArchived
	return nil
}

func (s *handlerRiskCharterRepo) Restore(_ context.Context, charter *entity.RiskCharter) error {
	charter.Status = entity.RiskCharterStatusActive
	return nil
}

func (s *handlerRiskCharterRepo) DeleteDraft(_ context.Context, id uuid.UUID) error {
	delete(s.items, id)
	return nil
}

func TestRiskCharterHandlerCreate(t *testing.T) {
	repo := &handlerRiskCharterRepo{}
	handler := NewRiskCharterHandler(
		riskcharteruc.NewCreateRiskCharterUseCase(repo),
		riskcharteruc.NewGetRiskCharterUseCase(repo),
		riskcharteruc.NewUpdateRiskCharterUseCase(repo),
		riskcharteruc.NewListRiskChartersUseCase(repo),
		riskcharteruc.NewWorkflowUseCase(repo),
	)

	orgID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	userID := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	body, err := json.Marshal(map[string]any{
		"title":          "Piagam Tahunan",
		"organizationId": orgID.String(),
		"uprLevel":       "upr_t1",
		"period":         "2026",
	})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userId", userID)
		c.Locals("accessScope", &entity.AccessScope{
			UserID: userID, OrganizationID: &orgID, AccessibleOrgIDs: []uuid.UUID{orgID}, Role: entity.RoleUnit,
		})
		return c.Next()
	})
	app.Post("/risk-charters", handler.Create)

	req := httptest.NewRequest(fiber.MethodPost, "/risk-charters", bytes.NewReader(body))
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
	if repo.created == nil {
		t.Fatal("expected charter to be created")
	}
	if repo.created.Status != entity.RiskCharterStatusDraft {
		t.Fatalf("expected created status draft, got %q", repo.created.Status)
	}
}
