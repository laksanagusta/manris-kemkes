package entity

import "github.com/google/uuid"

type PlanningObjective struct {
	ID        uuid.UUID `json:"id"`
	GoalID    uuid.UUID `json:"goalId"`
	Title     string    `json:"title"`
	SortOrder int       `json:"sortOrder"`
}
