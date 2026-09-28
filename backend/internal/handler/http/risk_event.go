package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/middleware"
	riskeventuc "github.com/manris/backend/internal/usecase/risk_event"
)

type RiskEventHandler struct{ service *riskeventuc.Service }

func NewRiskEventHandler(service *riskeventuc.Service) *RiskEventHandler {
	return &RiskEventHandler{service: service}
}

type riskEventRequest struct {
	Description           string   `json:"description"`
	ActualImpact          string   `json:"actualImpact"`
	Severity              string   `json:"severity"`
	ImmediateResponse     string   `json:"immediateResponse"`
	PostResponseCondition string   `json:"postResponseCondition"`
	Location              string   `json:"location"`
	AffectedParties       string   `json:"affectedParties"`
	SuspectedCause        string   `json:"suspectedCause"`
	DisruptionDuration    string   `json:"disruptionDuration"`
	ExtraordinaryReason   string   `json:"extraordinaryReason"`
	OngoingAction         string   `json:"ongoingAction"`
	EvidenceURL           string   `json:"evidenceUrl"`
	OrganizationID        string   `json:"organizationId"`
	OccurredAt            string   `json:"occurredAt"`
	ImpactTypes           []string `json:"impactTypes"`
	OtherImpactType       string   `json:"otherImpactType"`
	RiskIDs               []string `json:"riskIds"`
	FinancialLoss         *float64 `json:"financialLoss"`
	FinancialLossKnown    *bool    `json:"financialLossKnown"`
}

func riskEventScope(c *fiber.Ctx) (*uuid.UUID, []uuid.UUID, error) {
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return nil, nil, fiber.ErrForbidden
	}
	if scope.IsGlobal {
		return nil, nil, nil
	}
	if scope.OrganizationID == nil {
		return nil, nil, fiber.ErrForbidden
	}
	return scope.OrganizationID, scope.AccessibleOrgIDs, nil
}

func parseUUIDs(values []string) ([]uuid.UUID, error) {
	result := make([]uuid.UUID, 0, len(values))
	for _, value := range values {
		id, err := uuid.Parse(value)
		if err != nil {
			return nil, err
		}
		result = append(result, id)
	}
	return result, nil
}

func (h *RiskEventHandler) Create(c *fiber.Ctx) error {
	var req riskEventRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}
	actorID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return fiber.ErrUnauthorized
	}
	homeOrg, accessible, err := riskEventScope(c)
	if err != nil {
		return err
	}
	orgID := uuid.Nil
	if homeOrg != nil {
		orgID = *homeOrg
	} else if req.OrganizationID != "" {
		orgID, err = uuid.Parse(req.OrganizationID)
		if err != nil {
			return sendProblemDetails(c, 422, "Kesalahan Validasi", "https://api.manris.com/errors/validation-error", "organisasi wajib dipilih")
		}
	}
	riskIDs, err := parseUUIDs(req.RiskIDs)
	if err != nil {
		return sendProblemDetails(c, 422, "Kesalahan Validasi", "https://api.manris.com/errors/validation-error", "risiko terkait tidak valid")
	}
	occurredAt, err := time.Parse(time.RFC3339, req.OccurredAt)
	if err != nil {
		return sendProblemDetails(c, 422, "Kesalahan Validasi", "https://api.manris.com/errors/validation-error", "waktu kejadian tidak valid")
	}
	orgIDs := accessible
	if homeOrg != nil {
		orgIDs = []uuid.UUID{*homeOrg}
	}
	result, err := h.service.Create(c.Context(), riskeventuc.CreateInput{
		Description: req.Description, ActualImpact: req.ActualImpact, Severity: req.Severity, ImmediateResponse: req.ImmediateResponse,
		PostResponseCondition: req.PostResponseCondition, Location: req.Location, AffectedParties: req.AffectedParties,
		SuspectedCause: req.SuspectedCause, DisruptionDuration: req.DisruptionDuration, ExtraordinaryReason: req.ExtraordinaryReason,
		OngoingAction: req.OngoingAction, EvidenceURL: req.EvidenceURL, OccurredAt: occurredAt, ImpactTypes: req.ImpactTypes,
		FinancialLoss: req.FinancialLoss, FinancialLossKnown: req.FinancialLossKnown, OtherImpactType: req.OtherImpactType, OrganizationID: orgID, ActorID: actorID,
		RiskIDs: riskIDs, OrgIDs: orgIDs,
	})
	if err != nil {
		return handleError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"data": result})
}

func (h *RiskEventHandler) List(c *fiber.Ctx) error {
	_, orgIDs, err := riskEventScope(c)
	if err != nil {
		return err
	}
	var riskID *uuid.UUID
	if raw := c.Query("risk_id"); raw != "" {
		parsed, parseErr := uuid.Parse(raw)
		if parseErr != nil {
			return fiber.ErrBadRequest
		}
		riskID = &parsed
	}
	items, err := h.service.List(c.Context(), orgIDs, riskID)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": items})
}

func (h *RiskEventHandler) Get(c *fiber.Ctx) error {
	_, orgIDs, err := riskEventScope(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.ErrBadRequest
	}
	item, err := h.service.Get(c.Context(), id, orgIDs)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *RiskEventHandler) LinkRisks(c *fiber.Ctx) error {
	var req struct {
		RiskIDs []string `json:"riskIds"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.ErrBadRequest
	}
	actorID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return fiber.ErrUnauthorized
	}
	homeOrg, orgIDs, err := riskEventScope(c)
	if err != nil {
		return err
	}
	if homeOrg != nil {
		orgIDs = []uuid.UUID{*homeOrg}
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.ErrBadRequest
	}
	riskIDs, err := parseUUIDs(req.RiskIDs)
	if err != nil {
		return fiber.ErrBadRequest
	}
	item, err := h.service.LinkRisks(c.Context(), id, riskIDs, actorID, orgIDs)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}
