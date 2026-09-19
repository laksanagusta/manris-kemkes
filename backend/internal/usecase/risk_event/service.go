package risk_event

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type Service struct {
	events repository.RiskEventRepository
	risks  repository.RiskRepository
}

func NewService(events repository.RiskEventRepository, risks repository.RiskRepository) *Service {
	return &Service{events: events, risks: risks}
}

type CreateInput struct {
	Description, ActualImpact, Severity, ImmediateResponse, PostResponseCondition string
	Location, AffectedParties, SuspectedCause, DisruptionDuration                 string
	OtherImpactType                                                               string
	ExtraordinaryReason, OngoingAction, EvidenceURL                               string
	OccurredAt                                                                    time.Time
	ImpactTypes                                                                   []string
	FinancialLoss                                                                 *float64
	FinancialLossKnown                                                            *bool
	OrganizationID, ActorID                                                       uuid.UUID
	RiskIDs                                                                       []uuid.UUID
	OrgIDs                                                                        []uuid.UUID
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*entity.RiskEvent, error) {
	for _, riskID := range input.RiskIDs {
		risk, err := s.risks.GetByID(ctx, riskID, input.OrgIDs)
		if err != nil {
			return nil, domainerrors.ErrLinkedRiskNotFound
		}
		if input.OrganizationID == uuid.Nil && risk.OrganizationID != nil {
			input.OrganizationID = *risk.OrganizationID
		}
		if risk.OrganizationID == nil || *risk.OrganizationID != input.OrganizationID {
			return nil, domainerrors.ErrForbidden
		}
	}
	event := &entity.RiskEvent{
		Description: strings.TrimSpace(input.Description), OccurredAt: input.OccurredAt,
		ImpactTypes: input.ImpactTypes, OtherImpactType: strings.TrimSpace(input.OtherImpactType), ActualImpact: strings.TrimSpace(input.ActualImpact), Severity: input.Severity,
		ImmediateResponse: strings.TrimSpace(input.ImmediateResponse), PostResponseCondition: input.PostResponseCondition,
		Location: strings.TrimSpace(input.Location), AffectedParties: strings.TrimSpace(input.AffectedParties),
		SuspectedCause: strings.TrimSpace(input.SuspectedCause), FinancialLoss: input.FinancialLoss,
		FinancialLossKnown: input.FinancialLossKnown, DisruptionDuration: strings.TrimSpace(input.DisruptionDuration),
		ExtraordinaryReason: strings.TrimSpace(input.ExtraordinaryReason), OngoingAction: strings.TrimSpace(input.OngoingAction),
		EvidenceURL: strings.TrimSpace(input.EvidenceURL), OrganizationID: input.OrganizationID, CreatedBy: input.ActorID,
	}
	if err := event.Validate(); err != nil {
		return nil, err
	}
	if err := s.events.Create(ctx, event, input.RiskIDs); err != nil {
		return nil, err
	}
	return s.events.GetByID(ctx, event.ID, input.OrgIDs)
}

func (s *Service) Get(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskEvent, error) {
	return s.events.GetByID(ctx, id, orgIDs)
}

func (s *Service) List(ctx context.Context, orgIDs []uuid.UUID, riskID *uuid.UUID) ([]*entity.RiskEvent, error) {
	return s.events.List(ctx, orgIDs, riskID)
}

func (s *Service) LinkRisks(ctx context.Context, eventID uuid.UUID, riskIDs []uuid.UUID, actorID uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskEvent, error) {
	if len(riskIDs) == 0 {
		return nil, domainerrors.ErrInvalidInput
	}
	event, err := s.events.GetByID(ctx, eventID, orgIDs)
	if err != nil {
		return nil, err
	}
	for _, riskID := range riskIDs {
		risk, getErr := s.risks.GetByID(ctx, riskID, orgIDs)
		if getErr != nil {
			return nil, domainerrors.ErrLinkedRiskNotFound
		}
		if risk.OrganizationID == nil || *risk.OrganizationID != event.OrganizationID {
			return nil, domainerrors.ErrForbidden
		}
	}
	if err = s.events.AddRiskLinks(ctx, eventID, riskIDs, actorID); err != nil {
		return nil, err
	}
	return s.events.GetByID(ctx, eventID, orgIDs)
}
