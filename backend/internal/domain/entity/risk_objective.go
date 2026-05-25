package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type RiskObjective struct {
	ID                    uuid.UUID  `json:"id"`
	OrganizationID        uuid.UUID  `json:"organizationId"`
	PlanningID            uuid.UUID  `json:"planningId"`
	PlanningTitle         string     `json:"planningTitle"`
	PlanningStatus        string     `json:"planningStatus"`
	PlanningPeriod        string     `json:"planningPeriod"`
	Period                string     `json:"period"`
	Tujuan                string     `json:"tujuan"`
	Sasaran               string     `json:"sasaran"`
	IndikatorKinerjaUtama string     `json:"indikatorKinerjaUtama"`
	Target                string     `json:"target"`
	Program               string     `json:"program"`
	Kegiatan              string     `json:"kegiatan"`
	ProcessBusiness       string     `json:"processBusiness"`
	Status                string     `json:"status"`
	CreatedBy             *uuid.UUID `json:"createdBy,omitempty"`
	ApprovedBy            *uuid.UUID `json:"approvedBy,omitempty"`
	ApprovedAt            *time.Time `json:"approvedAt,omitempty"`
	CreatedAt             time.Time  `json:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt"`
}

func (o RiskObjective) Validate() error {
	if o.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(o.Period) == "" {
		return fmt.Errorf("period is required")
	}
	if strings.TrimSpace(o.Tujuan) == "" {
		return fmt.Errorf("tujuan is required")
	}
	if strings.TrimSpace(o.Sasaran) == "" {
		return fmt.Errorf("sasaran is required")
	}
	if strings.TrimSpace(o.IndikatorKinerjaUtama) == "" {
		return fmt.Errorf("indikator kinerja utama is required")
	}

	return nil
}
