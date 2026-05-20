package entity

import "github.com/google/uuid"

type PlanningROScope struct {
	ID                  uuid.UUID `json:"id"`
	ROID                uuid.UUID `json:"roId"`
	OrganizationID      *uuid.UUID `json:"organizationId,omitempty"`
	OrganizationCategory string    `json:"organizationCategory,omitempty"`
}

type PlanningROOption struct {
	ROID          uuid.UUID `json:"roId"`
	ROTitle       string    `json:"roTitle"`
	KegiatanTitle string    `json:"kegiatanTitle"`
	ProgramTitle  string    `json:"programTitle"`
	IKUTitle      string    `json:"ikuTitle"`
	SasaranTitle  string    `json:"sasaranTitle"`
	TujuanTitle   string    `json:"tujuanTitle"`
	Period        string    `json:"period"`
}
