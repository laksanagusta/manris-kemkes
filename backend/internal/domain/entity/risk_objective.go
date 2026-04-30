package entity

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

type RiskObjective struct {
	ID                    uuid.UUID  `json:"id"`
	OrganizationID        uuid.UUID  `json:"organizationId"`
	CharterID             *uuid.UUID `json:"charterId,omitempty"`
	Period                string     `json:"period"`
	Tujuan                string     `json:"tujuan"`
	Sasaran               string     `json:"sasaran"`
	IndikatorKinerjaUtama string     `json:"indikatorKinerjaUtama"`
	Target                string     `json:"target"`
	Program               string     `json:"program"`
	Kegiatan              string     `json:"kegiatan"`
	ProcessBusiness       string     `json:"processBusiness"`
	CreatedBy             *uuid.UUID `json:"createdBy,omitempty"`
	CreatedAt             time.Time  `json:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt"`
}

func (o RiskObjective) Validate() error {
	if o.OrganizationID == uuid.Nil {
		return errors.Wrap(errors.ErrInvalidInput, "organization id is required")
	}
	if strings.TrimSpace(o.Period) == "" {
		return errors.Wrap(errors.ErrInvalidInput, "period is required")
	}
	if strings.TrimSpace(o.Tujuan) == "" {
		return errors.Wrap(errors.ErrInvalidInput, "tujuan is required")
	}
	if strings.TrimSpace(o.Sasaran) == "" {
		return errors.Wrap(errors.ErrInvalidInput, "sasaran is required")
	}
	if strings.TrimSpace(o.IndikatorKinerjaUtama) == "" {
		return errors.Wrap(errors.ErrInvalidInput, "indikator kinerja utama is required")
	}
	return nil
}
