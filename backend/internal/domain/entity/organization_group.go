package entity

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

type OrganizationGroup struct {
	ID                    uuid.UUID                 `json:"id"`
	OwnerOrganizationID   uuid.UUID                 `json:"ownerOrganizationId"`
	OwnerOrganizationName string                    `json:"ownerOrganizationName,omitempty"`
	Name                  string                    `json:"name"`
	Description           string                    `json:"description"`
	CreatedBy             *uuid.UUID                `json:"createdBy,omitempty"`
	MemberCount           int                       `json:"memberCount"`
	Members               []OrganizationGroupMember `json:"members,omitempty"`
	CreatedAt             time.Time                 `json:"createdAt"`
	UpdatedAt             time.Time                 `json:"updatedAt"`
}

type OrganizationGroupMember struct {
	ID       uuid.UUID  `json:"id"`
	Name     string     `json:"name"`
	ParentID *uuid.UUID `json:"parentId,omitempty"`
	Location string     `json:"location,omitempty"`
}

func (g *OrganizationGroup) Normalize() {
	g.Name = strings.TrimSpace(g.Name)
	g.Description = strings.TrimSpace(g.Description)
}

func (g *OrganizationGroup) Validate() error {
	g.Normalize()
	if g.OwnerOrganizationID == uuid.Nil {
		return errors.Wrap(errors.ErrInvalidInput, "owner organization id is required")
	}
	if g.Name == "" {
		return errors.ErrInvalidName
	}
	return nil
}
