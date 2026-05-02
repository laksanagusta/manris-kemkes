package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type RiskCascade struct {
	ID           uuid.UUID  `json:"id"`
	SourceRiskID uuid.UUID  `json:"sourceRiskId"`
	TargetRiskID *uuid.UUID `json:"targetRiskId,omitempty"`
	SourceOrgID  uuid.UUID  `json:"sourceOrgId"`
	TargetOrgID  uuid.UUID  `json:"targetOrgId"`
	CascadeType  string     `json:"cascadeType"`
	AdoptionType string     `json:"adoptionType,omitempty"`
	Status       string     `json:"status"`
	AnalysisNote string     `json:"analysisNote"`
	DecisionNote string     `json:"decisionNote"`
	ProposedBy   *uuid.UUID `json:"proposedBy,omitempty"`
	DecidedBy    *uuid.UUID `json:"decidedBy,omitempty"`
	DecidedAt    *time.Time `json:"decidedAt,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`

	SourceRiskCode  string `json:"sourceRiskCode,omitempty"`
	SourceRiskTitle string `json:"sourceRiskTitle,omitempty"`
	TargetRiskCode  string `json:"targetRiskCode,omitempty"`
	TargetRiskTitle string `json:"targetRiskTitle,omitempty"`
	SourceOrgName   string `json:"sourceOrgName,omitempty"`
	TargetOrgName   string `json:"targetOrgName,omitempty"`
	ProposedByName  string `json:"proposedByName,omitempty"`
	DecidedByName   string `json:"decidedByName,omitempty"`
}

func (r RiskCascade) Validate() error {
	if r.SourceRiskID == uuid.Nil {
		return fmt.Errorf("source risk id is required")
	}
	if r.SourceOrgID == uuid.Nil {
		return fmt.Errorf("source organization id is required")
	}
	if r.TargetOrgID == uuid.Nil {
		return fmt.Errorf("target organization id is required")
	}
	switch strings.TrimSpace(r.CascadeType) {
	case "mandatory_top_down", "recommended_top_down", "bottom_up_escalation":
	default:
		return fmt.Errorf("invalid cascade type")
	}
	switch strings.TrimSpace(r.Status) {
	case "proposed", "analyzed", "accepted", "rejected", "implemented":
	default:
		return fmt.Errorf("invalid status")
	}
	switch strings.TrimSpace(r.AdoptionType) {
	case "", "full", "partial":
	default:
		return fmt.Errorf("invalid adoption type")
	}
	return nil
}
