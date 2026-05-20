package entity

import "github.com/google/uuid"

type PlanningIKU struct {
	ID          uuid.UUID `json:"id"`
	ObjectiveID uuid.UUID `json:"objectiveId"`
	Title       string    `json:"title"`
	Target      string    `json:"target"`
	SortOrder   int       `json:"sortOrder"`
}
