package entity

import "github.com/google/uuid"

type PlanningProgram struct {
	ID        uuid.UUID `json:"id"`
	IKUID     uuid.UUID `json:"ikuId"`
	Title     string    `json:"title"`
	SortOrder int       `json:"sortOrder"`
}
