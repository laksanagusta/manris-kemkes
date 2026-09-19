package entity

import (
	"strings"
	"time"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

const (
	RiskEventSeverityLow     = "low"
	RiskEventSeverityMedium  = "medium"
	RiskEventSeverityHigh    = "high"
	RiskEventSeverityExtreme = "extreme"
)

type RiskEvent struct {
	ID                    uuid.UUID          `json:"id"`
	Code                  string             `json:"code"`
	Description           string             `json:"description"`
	OccurredAt            time.Time          `json:"occurredAt"`
	ImpactTypes           []string           `json:"impactTypes"`
	OtherImpactType       string             `json:"otherImpactType,omitempty"`
	ActualImpact          string             `json:"actualImpact"`
	Severity              string             `json:"severity"`
	ImmediateResponse     string             `json:"immediateResponse"`
	PostResponseCondition string             `json:"postResponseCondition"`
	Location              string             `json:"location,omitempty"`
	AffectedParties       string             `json:"affectedParties,omitempty"`
	SuspectedCause        string             `json:"suspectedCause,omitempty"`
	FinancialLoss         *float64           `json:"financialLoss,omitempty"`
	FinancialLossKnown    *bool              `json:"financialLossKnown,omitempty"`
	DisruptionDuration    string             `json:"disruptionDuration,omitempty"`
	ExtraordinaryReason   string             `json:"extraordinaryReason,omitempty"`
	OngoingAction         string             `json:"ongoingAction,omitempty"`
	EvidenceURL           string             `json:"evidenceUrl,omitempty"`
	OrganizationID        uuid.UUID          `json:"organizationId"`
	OrganizationName      string             `json:"organizationName,omitempty"`
	CreatedBy             uuid.UUID          `json:"createdBy"`
	CreatedByName         string             `json:"createdByName,omitempty"`
	UpdatedBy             *uuid.UUID         `json:"updatedBy,omitempty"`
	LinkedRisks           []IncidentRiskLink `json:"linkedRisks"`
	CreatedAt             time.Time          `json:"createdAt"`
	UpdatedAt             time.Time          `json:"updatedAt"`
}

func (e *RiskEvent) Validate() error {
	if strings.TrimSpace(e.Description) == "" || e.OccurredAt.IsZero() || len(e.ImpactTypes) == 0 ||
		strings.TrimSpace(e.ActualImpact) == "" || strings.TrimSpace(e.ImmediateResponse) == "" {
		return domainerrors.ErrInvalidInput
	}
	hasFinancial, hasOther := false, false
	for _, impactType := range e.ImpactTypes {
		hasFinancial = hasFinancial || impactType == "financial"
		hasOther = hasOther || impactType == "other"
	}
	if hasOther && strings.TrimSpace(e.OtherImpactType) == "" {
		return domainerrors.ErrInvalidInput
	}
	if hasFinancial && (e.FinancialLossKnown == nil || (*e.FinancialLossKnown && e.FinancialLoss == nil)) {
		return domainerrors.ErrInvalidInput
	}
	switch e.Severity {
	case RiskEventSeverityLow, RiskEventSeverityMedium, RiskEventSeverityHigh, RiskEventSeverityExtreme:
	default:
		return domainerrors.ErrInvalidSeverity
	}
	switch e.PostResponseCondition {
	case "recovered", "controlled", "ongoing", "worsening", "unknown":
	default:
		return domainerrors.ErrInvalidInput
	}
	if e.Severity == RiskEventSeverityExtreme && strings.TrimSpace(e.ExtraordinaryReason) == "" {
		return domainerrors.ErrInvalidInput
	}
	if (e.PostResponseCondition == "ongoing" || e.PostResponseCondition == "worsening") && strings.TrimSpace(e.OngoingAction) == "" {
		return domainerrors.ErrInvalidInput
	}
	if e.OrganizationID == uuid.Nil || e.CreatedBy == uuid.Nil {
		return domainerrors.ErrInvalidInput
	}
	return nil
}
