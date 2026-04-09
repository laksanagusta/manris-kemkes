package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// KRI represents a Key Risk Indicator
type KRI struct {
	ID                uuid.UUID  `json:"id"`
	RiskID            uuid.UUID  `json:"riskId"`
	RiskCode          string     `json:"riskCode"`
	RiskTitle         string     `json:"riskTitle"`
	Name              string     `json:"name"`
	Description       string     `json:"description"`
	Metric            string     `json:"metric"`
	ThresholdMin      float64    `json:"thresholdMin"`
	ThresholdMax      float64    `json:"thresholdMax"`
	AmberThresholdMin *float64   `json:"amberThresholdMin,omitempty"`
	AmberThresholdMax *float64   `json:"amberThresholdMax,omitempty"`
	CurrentValue      float64    `json:"currentValue"`
	Direction         string     `json:"direction"`
	Frequency         string     `json:"frequency"`
	OrganizationID    *uuid.UUID `json:"organizationId,omitempty"`
	OrgName           string     `json:"orgName"`
	IsArchived        bool       `json:"isArchived"`
	ArchivedAt        *time.Time `json:"archivedAt,omitempty"`
	ArchivedReason    string     `json:"archivedReason,omitempty"`
	LastUpdated       time.Time  `json:"lastUpdated"`
	CreatedAt         time.Time  `json:"createdAt"`
}

func (k *KRI) normalizedDirection() string {
	switch k.Direction {
	case "higher_worse", "increasing":
		return "higher_worse"
	case "lower_worse", "decreasing":
		return "lower_worse"
	default:
		return k.Direction
	}
}

// Validate performs domain validation on KRI
func (k *KRI) Validate() error {
	if k.Name == "" {
		return errors.ErrInvalidName
	}
	if k.ThresholdMin >= k.ThresholdMax {
		return errors.ErrInvalidThreshold
	}
	switch k.normalizedDirection() {
	case "higher_worse":
		if k.AmberThresholdMax == nil {
			return errors.ErrInvalidThreshold
		}
	case "lower_worse":
		if k.AmberThresholdMin == nil {
			return errors.ErrInvalidThreshold
		}
	}
	return nil
}

// IsThresholdBreached checks if current value breaches threshold
func (k *KRI) IsThresholdBreached() bool {
	switch k.normalizedDirection() {
	case "higher_worse":
		return k.CurrentValue > k.ThresholdMax
	case "lower_worse":
		return k.CurrentValue < k.ThresholdMin
	default:
		// For bidirectional or no direction
		return k.CurrentValue < k.ThresholdMin || k.CurrentValue > k.ThresholdMax
	}
}

// GetStatus returns the status of KRI based on current value
func (k *KRI) GetStatus() string {
	if k.IsThresholdBreached() {
		return "breached"
	}
	switch k.normalizedDirection() {
	case "higher_worse":
		if k.AmberThresholdMax != nil {
			if k.CurrentValue >= *k.AmberThresholdMax {
				return "warning"
			}
		} else if k.CurrentValue >= (k.ThresholdMax * 0.9) {
			return "warning"
		}
	case "lower_worse":
		if k.AmberThresholdMin != nil {
			if k.CurrentValue <= *k.AmberThresholdMin {
				return "warning"
			}
		} else if k.CurrentValue <= (k.ThresholdMin * 1.1) {
			return "warning"
		}
	}
	return "normal"
}
