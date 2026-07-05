package entity

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

const (
	MitigationTypeReduceProbability = "reduce_probability"
	MitigationTypeReduceImpact      = "reduce_impact"
	MitigationTypeReduceBoth        = "reduce_both"
)

var allowedMitigationTypes = map[string]struct{}{
	"":                              {},
	MitigationTypeReduceProbability: {},
	MitigationTypeReduceImpact:      {},
	MitigationTypeReduceBoth:        {},
}

// Mitigation represents a risk treatment plan item
type Mitigation struct {
	ID                    uuid.UUID  `json:"id"`
	RiskID                uuid.UUID  `json:"riskId"`
	AssessmentCycle       string     `json:"assessmentCycle,omitempty"`
	Action                string     `json:"action"`
	Owner                 string     `json:"owner"`
	OwnerUserID           *uuid.UUID `json:"ownerUserId,omitempty"`
	DueDate               *string    `json:"dueDate,omitempty"`
	Frequency             string     `json:"frequency,omitempty"`
	RecurringInterval     *string    `json:"recurringInterval,omitempty"`
	ReportDay             *int       `json:"reportDay,omitempty"`  // 0=Sun..6=Sat (for mingguan)
	ReportDate            *int       `json:"reportDate,omitempty"` // 1-31 (for bulanan/triwulan)
	ExecutionScheduleText string     `json:"executionScheduleText,omitempty"`
	TargetCost            float64    `json:"targetCost"`
	SortOrder             int        `json:"sortOrder"`
	CreatedAt             time.Time  `json:"createdAt"`

	MitigationType         string `json:"mitigationType,omitempty"`
	ActivityStage          string `json:"activityStage,omitempty"`
	ExpectedOutput         string `json:"expectedOutput,omitempty"`
	QuantitativeTarget     string `json:"quantitativeTarget,omitempty"`
	SupportingUnit         string `json:"supportingUnit,omitempty"`
	ResourcesRequired      string `json:"resourcesRequired,omitempty"`
	ContingencyPlan        string `json:"contingencyPlan,omitempty"`
	PotentialObstacle      string `json:"potentialObstacle,omitempty"`
	CostBenefitNote        string `json:"costBenefitNote,omitempty"`
	IsBreakthroughActivity bool   `json:"isBreakthroughActivity,omitempty"`
	IsExistingControl      bool   `json:"isExistingControl,omitempty"`
}

// MitigationAssoc represents a mitigation joined with its parent risk info
type MitigationAssoc struct {
	Mitigation
	RiskCode    string     `json:"riskCode"`
	RiskTitle   string     `json:"riskTitle"`
	RiskOrgID   *uuid.UUID `json:"riskOrgId,omitempty"`
	Probability int        `json:"probability"`
	Impact      int        `json:"impact"`
}

// Validate performs domain validation on Mitigation
func (m *Mitigation) Validate() error {
	m.Action = strings.TrimSpace(m.Action)
	m.Owner = strings.TrimSpace(m.Owner)
	m.MitigationType = strings.TrimSpace(m.MitigationType)
	if m.DueDate != nil {
		dueDate := strings.TrimSpace(*m.DueDate)
		if dueDate == "" {
			m.DueDate = nil
		} else {
			m.DueDate = &dueDate
		}
	}
	if m.Action == "" {
		return errors.Wrap(errors.ErrInvalidInput, "mitigation action is required")
	}
	if m.Owner == "" {
		return errors.Wrap(errors.ErrInvalidInput, "mitigation owner is required")
	}
	if _, ok := allowedMitigationTypes[m.MitigationType]; !ok {
		return errors.ErrInvalidMitigationType
	}
	return nil
}

// NormalizeMitigationType returns a safe mitigation type default.
func NormalizeMitigationType(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return MitigationTypeReduceProbability
	}
	return value
}

// IsOverdue checks if mitigation is overdue
func (m *Mitigation) IsOverdue() bool {
	if m.DueDate == nil {
		return false
	}

	dueDate, err := time.Parse("2006-01-02", *m.DueDate)
	if err != nil {
		return false
	}

	return time.Now().After(dueDate)
}

// GetStatus returns the status of mitigation
func (m *Mitigation) GetStatus() string {
	if m.IsOverdue() {
		return "overdue"
	}
	if m.DueDate == nil {
		return "not_scheduled"
	}
	return "on_track"
}
