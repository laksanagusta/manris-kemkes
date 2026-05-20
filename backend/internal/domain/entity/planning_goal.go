package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type PlanningGoal struct {
	ID             uuid.UUID `json:"id"`
	OrganizationID uuid.UUID `json:"organizationId"`
	Period         string    `json:"period"`
	Title          string    `json:"title"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

func (g PlanningGoal) Validate() error {
	if g.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(g.Period) == "" {
		return fmt.Errorf("period is required")
	}
	if strings.TrimSpace(g.Title) == "" {
		return fmt.Errorf("title is required")
	}
	switch strings.TrimSpace(g.Status) {
	case "", "draft", "active", "archived":
		return nil
	default:
		return fmt.Errorf("invalid status")
	}
}
