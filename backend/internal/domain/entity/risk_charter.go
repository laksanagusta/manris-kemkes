package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type RiskCharter struct {
	ID                 uuid.UUID  `json:"id"`
	OrganizationID     uuid.UUID  `json:"organizationId"`
	UPRLevel           string     `json:"uprLevel"`
	Period             string     `json:"period"`
	RiskOwnerName      string     `json:"riskOwnerName"`
	RiskOwnerUserID    *uuid.UUID `json:"riskOwnerUserId,omitempty"`
	RiskTeamName       string     `json:"riskTeamName"`
	Scope              string     `json:"scope"`
	LegalBasis         string     `json:"legalBasis"`
	InternalContext    string     `json:"internalContext"`
	ExternalContext    string     `json:"externalContext"`
	StakeholderSummary string     `json:"stakeholderSummary"`
	CreatedBy          *uuid.UUID `json:"createdBy,omitempty"`
	ApprovedBy         *uuid.UUID `json:"approvedBy,omitempty"`
	ApprovedAt         *time.Time `json:"approvedAt,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
}

func (r RiskCharter) Validate() error {
	if r.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(r.Period) == "" {
		return fmt.Errorf("period is required")
	}
	if strings.TrimSpace(r.RiskOwnerName) == "" {
		return fmt.Errorf("risk owner name is required")
	}

	switch r.UPRLevel {
	case "eksekutif", "upr_t1", "upr_t2":
	default:
		return fmt.Errorf("invalid upr level")
	}

	return nil
}