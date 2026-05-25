package entity

import "github.com/google/uuid"

type PlanningROScope struct {
	ID                   uuid.UUID  `json:"id"`
	ROID                 uuid.UUID  `json:"roId"`
	OrganizationID       *uuid.UUID `json:"organizationId,omitempty"`
	OrganizationCategory string     `json:"organizationCategory,omitempty"`
}

type PlanningROOption struct {
	ROID           uuid.UUID `json:"roId"`
	ROTitle        string    `json:"roTitle"`
	ActivityTitle  string    `json:"activityTitle"`
	ProgramTitle   string    `json:"programTitle"`
	IKUTitle       string    `json:"ikuTitle"`
	ObjectiveTitle string    `json:"objectiveTitle"`
	PlanningID     uuid.UUID `json:"planningId"`
	PlanningTitle  string    `json:"planningTitle"`
	PlanningStatus string    `json:"planningStatus"`
	PlanningPeriod string    `json:"planningPeriod"`
	KegiatanTitle  string    `json:"kegiatanTitle,omitempty"`
	SasaranTitle   string    `json:"sasaranTitle,omitempty"`
	TujuanTitle    string    `json:"tujuanTitle,omitempty"`
}
