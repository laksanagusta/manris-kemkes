package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	FormalReportStatusDraft     = "draft"
	FormalReportStatusGenerated = "generated"
	FormalReportStatusSubmitted = "submitted"
	FormalReportStatusApproved  = "approved"
)

const (
	FormalReportTypeAnnualRiskProfile        = "annual_risk_profile"
	FormalReportTypeSemiannualImplementation = "semiannual_mr_implementation"
	FormalReportTypeSemiannualSupervision    = "semiannual_mr_supervision"
	FormalReportTypeTMPMR                    = "tmpmr_report"
	FormalReportTypeMonitoringEvaluation     = "monitoring_evaluation_report"
)

var validFormalReportTypes = map[string]struct{}{
	FormalReportTypeAnnualRiskProfile:        {},
	FormalReportTypeSemiannualImplementation: {},
	FormalReportTypeSemiannualSupervision:    {},
	FormalReportTypeTMPMR:                    {},
	FormalReportTypeMonitoringEvaluation:     {},
}

var validFormalReportStatuses = map[string]struct{}{
	FormalReportStatusDraft:     {},
	FormalReportStatusGenerated: {},
	FormalReportStatusSubmitted: {},
	FormalReportStatusApproved:  {},
}

type FormalReport struct {
	ID               uuid.UUID      `json:"id"`
	OrganizationID   uuid.UUID      `json:"organizationId"`
	Period           string         `json:"period"`
	ReportType       string         `json:"reportType"`
	Status           string         `json:"status"`
	GeneratedFileURL string         `json:"generatedFileUrl"`
	GeneratedBy      *uuid.UUID     `json:"generatedBy,omitempty"`
	GeneratedAt      *time.Time     `json:"generatedAt,omitempty"`
	Metadata         map[string]any `json:"metadata"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
}

func IsValidFormalReportType(reportType string) bool {
	_, ok := validFormalReportTypes[reportType]
	return ok
}

func IsValidFormalReportStatus(status string) bool {
	_, ok := validFormalReportStatuses[status]
	return ok
}

func (r *FormalReport) EnsureMetadata() {
	if r.Metadata == nil {
		r.Metadata = make(map[string]any)
	}
}

func (r FormalReport) Validate() error {
	if r.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(r.Period) == "" {
		return fmt.Errorf("period is required")
	}
	if !IsValidFormalReportType(strings.TrimSpace(r.ReportType)) {
		return fmt.Errorf("invalid formal report type")
	}
	if !IsValidFormalReportStatus(strings.TrimSpace(r.Status)) {
		return fmt.Errorf("invalid formal report status")
	}
	return nil
}
