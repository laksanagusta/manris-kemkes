package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// Risk represents a risk register entry
type Risk struct {
	ID             uuid.UUID  `json:"id"`
	Code           string     `json:"code"`
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	Status         string     `json:"status"`
	OrganizationID *uuid.UUID `json:"organizationId,omitempty"`
	OrgName        string     `json:"orgName"`
	CreatedBy      *uuid.UUID `json:"createdBy,omitempty"`
	CreatedByName  string     `json:"createdByName"`
	RiskOwnerID    *uuid.UUID `json:"riskOwnerId,omitempty"`
	ControlOwnerID *uuid.UUID `json:"controlOwnerId,omitempty"`

	// Section 1
	Cause           []string `json:"cause,omitempty"`
	RiskSource      string   `json:"riskSource,omitempty"`
	Controllability string   `json:"controllability,omitempty"`
	ImpactDesc      []string `json:"impactDesc,omitempty"`

	// Section 2
	ExistingControl      string  `json:"existingControl,omitempty"`
	ControlEffectiveness string  `json:"controlEffectiveness,omitempty"`
	Probability          int     `json:"probability"`
	Impact               int     `json:"impact"`
	Weight               float64 `json:"weight,omitempty"`
	InherentScore        int     `json:"inherentScore"`

	// Section 3
	RiskPriority    int    `json:"riskPriority,omitempty"`
	RiskAppetite    string `json:"riskAppetite,omitempty"`
	TreatmentOption string `json:"treatmentOption,omitempty"`

	// Section 4
	Mitigations []Mitigation `json:"mitigations,omitempty"`

	// Section 5
	TargetProbability int     `json:"targetProbability,omitempty"`
	TargetImpact      int     `json:"targetImpact,omitempty"`
	TargetWeight      float64 `json:"targetWeight,omitempty"`
	TargetScore       int     `json:"targetScore,omitempty"`
	NextReviewDate    *string `json:"nextReviewDate,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Validate performs domain validation on Risk
func (r *Risk) Validate() error {
	if r.Title == "" {
		return errors.ErrInvalidTitle
	}
	if r.Code == "" {
		return errors.ErrInvalidCode
	}
	if r.Status == "" {
		return errors.ErrInvalidStatus
	}
	if r.Probability < 1 || r.Probability > 5 {
		return errors.ErrInvalidProbability
	}
	if r.Impact < 1 || r.Impact > 5 {
		return errors.ErrInvalidImpact
	}
	return nil
}

// CanBeSubmittedForApproval checks if risk can be submitted for approval
func (r *Risk) CanBeSubmittedForApproval() bool {
	return r.Status == "draft" || r.Status == "rejected"
}

// GetInherentScore calculates inherent score
func (r *Risk) GetInherentScore() int {
	return r.Probability * r.Impact
}

// GetRiskLevel returns risk level based on score
func (r *Risk) GetRiskLevel() string {
	score := r.GetInherentScore()
	if score >= 15 {
		return "extreme"
	} else if score >= 10 {
		return "high"
	} else if score >= 5 {
		return "medium"
	}
	return "low"
}

// IsFinal checks if risk is in final status
func (r *Risk) IsFinal() bool {
	return r.Status == "approved" || r.Status == "rejected"
}

// AddMitigation adds a mitigation to the risk
func (r *Risk) AddMitigation(mitigation Mitigation) {
	r.Mitigations = append(r.Mitigations, mitigation)
}
