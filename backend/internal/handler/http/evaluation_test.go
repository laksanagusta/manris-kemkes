package http

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	evaluationuc "github.com/manris/backend/internal/usecase/evaluation"
)

type stubEvaluationCreateUC struct {
	input  evaluationuc.CreateInput
	result *entity.Evaluation
}

func (s *stubEvaluationCreateUC) Execute(_ context.Context, input evaluationuc.CreateInput) (*entity.Evaluation, error) {
	s.input = input
	return s.result, nil
}

type stubEvaluationListUC struct {
	input  evaluationuc.ListInput
	result *evaluationuc.ListOutput
}

func (s *stubEvaluationListUC) Execute(_ context.Context, input evaluationuc.ListInput) (*evaluationuc.ListOutput, error) {
	s.input = input
	return s.result, nil
}

type stubEvaluationGetUC struct {
	input  evaluationuc.GetInput
	result *entity.Evaluation
}

func (s *stubEvaluationGetUC) Execute(_ context.Context, input evaluationuc.GetInput) (*entity.Evaluation, error) {
	s.input = input
	return s.result, nil
}

type stubEvaluationUpdateUC struct {
	input  evaluationuc.UpdateInput
	result *entity.Evaluation
}

func (s *stubEvaluationUpdateUC) Execute(_ context.Context, input evaluationuc.UpdateInput) (*entity.Evaluation, error) {
	s.input = input
	return s.result, nil
}

type stubEvaluationFinalizeUC struct {
	called bool
	input  evaluationuc.FinalizeInput
	result *entity.Evaluation
}

func (s *stubEvaluationFinalizeUC) Execute(_ context.Context, input evaluationuc.FinalizeInput) (*entity.Evaluation, error) {
	s.called = true
	s.input = input
	return s.result, nil
}

type stubEvaluationReopenUC struct {
	called bool
	input  evaluationuc.ReopenInput
	result *entity.Evaluation
}

func (s *stubEvaluationReopenUC) Execute(_ context.Context, input evaluationuc.ReopenInput) (*entity.Evaluation, error) {
	s.called = true
	s.input = input
	return s.result, nil
}

type stubEvaluationExportUC struct {
	result *evaluationuc.ExportPDFOutput
}

func (s *stubEvaluationExportUC) Execute(_ context.Context, input evaluationuc.ExportPDFInput) (*evaluationuc.ExportPDFOutput, error) {
	return s.result, nil
}

type stubEvaluationGroupResolver struct {
	orgIDs []uuid.UUID
	err    error
}

func (s stubEvaluationGroupResolver) ResolveReportGroup(context.Context, uuid.UUID, *entity.AccessScope) ([]uuid.UUID, error) {
	return append([]uuid.UUID(nil), s.orgIDs...), s.err
}

func newEvaluationHandlerForTest() (*EvaluationHandler, *stubEvaluationCreateUC, *stubEvaluationListUC, *stubEvaluationGetUC, *stubEvaluationUpdateUC, *stubEvaluationFinalizeUC, *stubEvaluationReopenUC, *stubEvaluationExportUC) {
	createUC := &stubEvaluationCreateUC{result: &entity.Evaluation{ID: uuid.New(), Status: entity.EvaluationStatusDraft}}
	listUC := &stubEvaluationListUC{result: &evaluationuc.ListOutput{Data: []*entity.Evaluation{}, Total: 0, Page: 1, Limit: 10}}
	getUC := &stubEvaluationGetUC{result: &entity.Evaluation{ID: uuid.New()}}
	updateUC := &stubEvaluationUpdateUC{result: &entity.Evaluation{ID: uuid.New(), Status: entity.EvaluationStatusDraft}}
	finalizeUC := &stubEvaluationFinalizeUC{result: &entity.Evaluation{ID: uuid.New(), Status: entity.EvaluationStatusFinal}}
	reopenUC := &stubEvaluationReopenUC{result: &entity.Evaluation{ID: uuid.New(), Status: entity.EvaluationStatusDraft}}
	exportUC := &stubEvaluationExportUC{result: &evaluationuc.ExportPDFOutput{Filename: "evaluation.pdf", Bytes: []byte("%PDF-1.4 fake")}}

	handler := NewEvaluationHandler(createUC, getUC, listUC, updateUC, finalizeUC, reopenUC, exportUC, nil)
	return handler, createUC, listUC, getUC, updateUC, finalizeUC, reopenUC, exportUC
}

func TestEvaluationHandlerCreateReturnsCreated(t *testing.T) {
	handler, createUC, _, _, _, _, _, _ := newEvaluationHandlerForTest()
	userID := uuid.New()
	orgID := uuid.New()

	app := fiber.New()
	app.Post("/evaluations", func(c *fiber.Ctx) error {
		c.Locals("userId", userID)
		c.Locals("accessScope", &entity.AccessScope{OrganizationID: &orgID, AccessibleOrgIDs: []uuid.UUID{orgID}})
		return c.Next()
	}, handler.Create)

	req := httptest.NewRequest(fiber.MethodPost, "/evaluations", strings.NewReader(`{"organizationId":"`+orgID.String()+`","period":"2026-H1"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("StatusCode = %d, want %d", resp.StatusCode, fiber.StatusCreated)
	}
	if createUC.input.CreatedBy == nil || *createUC.input.CreatedBy != userID {
		t.Fatalf("CreatedBy not set from context")
	}
}

func TestEvaluationHandlerUpdateRejectsInvalidID(t *testing.T) {
	handler, _, _, _, _, _, _, _ := newEvaluationHandlerForTest()

	app := fiber.New()
	app.Put("/evaluations/:id", handler.Update)
	req := httptest.NewRequest(fiber.MethodPut, "/evaluations/not-a-uuid", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("StatusCode = %d, want %d", resp.StatusCode, fiber.StatusBadRequest)
	}
}

func TestEvaluationHandlerFinalizeCallsUseCase(t *testing.T) {
	handler, _, _, _, _, finalizeUC, _, _ := newEvaluationHandlerForTest()
	id := uuid.New()

	app := fiber.New()
	app.Post("/evaluations/:id/finalize", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{OrganizationID: ptrUUID(uuid.New())})
		return c.Next()
	}, handler.Finalize)

	req := httptest.NewRequest(fiber.MethodPost, "/evaluations/"+id.String()+"/finalize", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("StatusCode = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}
	if !finalizeUC.called || finalizeUC.input.ID != id {
		t.Fatalf("Finalize use case not called with expected ID")
	}
}

func TestEvaluationHandlerReopenCallsUseCase(t *testing.T) {
	handler, _, _, _, _, _, reopenUC, _ := newEvaluationHandlerForTest()
	id := uuid.New()

	app := fiber.New()
	app.Post("/evaluations/:id/reopen", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{OrganizationID: ptrUUID(uuid.New())})
		return c.Next()
	}, handler.Reopen)

	req := httptest.NewRequest(fiber.MethodPost, "/evaluations/"+id.String()+"/reopen", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("StatusCode = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}
	if !reopenUC.called || reopenUC.input.ID != id {
		t.Fatalf("Reopen use case not called with expected ID")
	}
}

func TestEvaluationHandlerListParsesFilters(t *testing.T) {
	handler, _, listUC, _, _, _, _, _ := newEvaluationHandlerForTest()
	orgID := uuid.New()
	ownID := uuid.New()

	app := fiber.New()
	app.Get("/evaluations", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{OrganizationID: &ownID, AccessibleOrgIDs: []uuid.UUID{ownID, orgID}})
		return c.Next()
	}, handler.List)

	req := httptest.NewRequest(fiber.MethodGet, "/evaluations?organization_id="+orgID.String()+"&period=2026-H1&status=draft&q=monitor&page=3&limit=25", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("StatusCode = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}
	if listUC.input.OrganizationID == nil || *listUC.input.OrganizationID != orgID {
		t.Fatalf("List input organization not parsed correctly")
	}
	if len(listUC.input.OrganizationIDs) != 1 || listUC.input.OrganizationIDs[0] != orgID {
		t.Fatalf("List input organization IDs not parsed correctly")
	}
	if listUC.input.Page != 3 || listUC.input.Limit != 25 || listUC.input.Period != "2026-H1" || listUC.input.Status != "draft" || listUC.input.Query != "monitor" {
		t.Fatalf("unexpected list input: %#v", listUC.input)
	}
}

func TestEvaluationHandlerListAcceptsOrganizationGroup(t *testing.T) {
	handler, _, listUC, _, _, _, _, _ := newEvaluationHandlerForTest()
	ownID := uuid.New()
	memberID := uuid.New()

	handler.groupResolver = stubEvaluationGroupResolver{orgIDs: []uuid.UUID{memberID}}

	app := fiber.New()
	app.Get("/evaluations", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{OrganizationID: &ownID, AccessibleOrgIDs: []uuid.UUID{ownID, memberID}})
		return c.Next()
	}, handler.List)

	req := httptest.NewRequest(fiber.MethodGet, "/evaluations?organization_group_id="+uuid.New().String()+"&period=2026-H1", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("StatusCode = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}
	if len(listUC.input.OrganizationIDs) != 1 || listUC.input.OrganizationIDs[0] != memberID {
		t.Fatalf("List input organization group not resolved correctly: %#v", listUC.input.OrganizationIDs)
	}
}

func ptrUUID(id uuid.UUID) *uuid.UUID {
	return &id
}
