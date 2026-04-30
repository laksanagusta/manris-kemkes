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

func (s *handlerRiskCharterRepo) Update(_ context.Context, charter *entity.RiskCharter) error {
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

func (s *handlerRiskCharterRepo) ExistsByOrgPeriodLevel(_ context.Context, _ uuid.UUID, _ string, _ string, excludeID *uuid.UUID) (bool, error) {
	for id, item := range s.items {
		if excludeID != nil && id == *excludeID {
			continue
		}
		if item != nil {
			return true, nil
		}
	}
	return false, nil
}

func TestRiskCharterHandlerCreate(t *testing.T) {
	repo := &handlerRiskCharterRepo{}
	handler := NewRiskCharterHandler(
		riskcharteruc.NewCreateRiskCharterUseCase(repo),
		riskcharteruc.NewGetRiskCharterUseCase(repo),
		riskcharteruc.NewUpdateRiskCharterUseCase(repo),
		riskcharteruc.NewListRiskChartersUseCase(repo),
	)

	body, err := json.Marshal(map[string]any{
		"organizationId": "11111111-1111-1111-1111-111111111111",
		"uprLevel":       "upr_t1",
		"period":         "2026-H1",
		"riskOwnerName":  "Direktur A",
		"status":         "draft",
	})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}

	app := fiber.New()
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
}
