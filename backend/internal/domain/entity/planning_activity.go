package entity

import "github.com/google/uuid"

type PlanningActivity struct {
	ID        uuid.UUID `json:"id"`
	ProgramID uuid.UUID `json:"programId"`
	Title     string    `json:"title"`
	SortOrder int       `json:"sortOrder"`
}
