package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type PlanningROScopeMode string

const (
	PlanningROScopeAllSatker          PlanningROScopeMode = "all_satker"
	PlanningROScopeSatkerGroup        PlanningROScopeMode = "satker_group"
	PlanningROScopeExplicitSatkerList PlanningROScopeMode = "explicit_satker_list"
)

type PlanningROFreezeStatus string

const (
	PlanningROFreezeDraft    PlanningROFreezeStatus = "draft"
	PlanningROFreezeActive   PlanningROFreezeStatus = "active"
	PlanningROFreezeFrozen   PlanningROFreezeStatus = "frozen"
	PlanningROFreezeArchived PlanningROFreezeStatus = "archived"
)

type PlanningRO struct {
	ID           uuid.UUID           `json:"id"`
	ActivityID   uuid.UUID           `json:"activityId"`
	Period       string              `json:"period"`
	Title        string              `json:"title"`
	ScopeMode    PlanningROScopeMode `json:"scopeMode"`
	FreezeStatus PlanningROFreezeStatus `json:"freezeStatus"`
	CreatedAt    time.Time           `json:"createdAt"`
	UpdatedAt    time.Time           `json:"updatedAt"`
}

func (ro PlanningRO) Validate() error {
	if ro.ActivityID == uuid.Nil {
		return fmt.Errorf("activity id is required")
	}
	if strings.TrimSpace(ro.Period) == "" {
		return fmt.Errorf("period is required")
	}
	if strings.TrimSpace(ro.Title) == "" {
		return fmt.Errorf("title is required")
	}
	switch ro.ScopeMode {
	case PlanningROScopeAllSatker, PlanningROScopeSatkerGroup, PlanningROScopeExplicitSatkerList:
	default:
		return fmt.Errorf("invalid scope mode")
	}
	switch ro.FreezeStatus {
	case "", PlanningROFreezeDraft, PlanningROFreezeActive, PlanningROFreezeFrozen, PlanningROFreezeArchived:
	default:
		return fmt.Errorf("invalid freeze status")
	}
	return nil
}
