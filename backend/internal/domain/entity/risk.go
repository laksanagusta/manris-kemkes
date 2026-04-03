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
	Category       string     `json:"category,omitempty"`
	Status         string     `json:"status"`
	VersionGroupID uuid.UUID  `json:"versionGroupId"`
	PreviousRiskID *uuid.UUID `json:"previousRiskId,omitempty"`
	IsCurrent      bool       `json:"isCurrent"`
	ArchivedAt     *time.Time `json:"archivedAt,omitempty"`
	ArchivedReason string     `json:"archivedReason,omitempty"`
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
	TargetProbability int                  `json:"targetProbability,omitempty"`
	TargetImpact      int                  `json:"targetImpact,omitempty"`
	TargetWeight      float64              `json:"targetWeight,omitempty"`
	TargetScore       int                  `json:"targetScore,omitempty"`
	NextReviewDate    *string              `json:"nextReviewDate,omitempty"`
	AssessmentCycle   string               `json:"assessmentCycle,omitempty"`
	ReviewType        string               `json:"reviewType,omitempty"`
	ChangeReason      string               `json:"changeReason,omitempty"`
	ReviewSummary     string               `json:"reviewSummary,omitempty"`
	ReviewStartedAt   *time.Time           `json:"reviewStartedAt,omitempty"`
	ReviewSubmittedAt *time.Time           `json:"reviewSubmittedAt,omitempty"`
	ReviewApprovedAt  *time.Time           `json:"reviewApprovedAt,omitempty"`
	DraftApprovalLine []ApprovalLineMember `json:"draftApprovalLine,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ApprovalLineMember struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

const (
	RiskCategoryStrategis          = "strategis"
	RiskCategoryOperasional        = "operasional"
	RiskCategoryKepatuhan          = "kepatuhan"
	RiskCategoryFinansial          = "finansial"
	RiskCategoryReputasi           = "reputasi"
	RiskCategoryTeknologiInformasi = "teknologi_informasi"
)

var allowedRiskCategories = map[string]struct{}{
	"":                             {},
	RiskCategoryStrategis:          {},
	RiskCategoryOperasional:        {},
	RiskCategoryKepatuhan:          {},
	RiskCategoryFinansial:          {},
	RiskCategoryReputasi:           {},
	RiskCategoryTeknologiInformasi: {},
}

func IsValidRiskCategory(category string) bool {
	_, ok := allowedRiskCategories[category]
	return ok
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
	if !IsValidRiskCategory(r.Category) {
		return errors.ErrInvalidRiskCategory
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
	return r.Status == "final" || r.Status == "approved" || r.Status == "rejected"
}

// IsApprovedCurrent returns whether this risk is the active approved version.
func (r *Risk) IsApprovedCurrent() bool {
	return r.Status == "approved" && r.IsCurrent
}

// CanBeReassessed returns whether the risk can start a periodic reassessment.
func (r *Risk) CanBeReassessed() bool {
	return r.IsApprovedCurrent()
}

// AddMitigation adds a mitigation to the risk
func (r *Risk) AddMitigation(mitigation Mitigation) {
	r.Mitigations = append(r.Mitigations, mitigation)
}
