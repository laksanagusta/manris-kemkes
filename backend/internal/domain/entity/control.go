package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// Control represents a control library entry
type Control struct {
	ID             uuid.UUID
	RiskID         *uuid.UUID
	RiskCode       *string
	RiskTitle      *string
	Code           string
	Name           string
	Description    string
	Type           string
	Frequency      string
	Method         string
	Owner          string
	Effectiveness  string
	TestDate       *time.Time
	OrganizationID *uuid.UUID
	OrgName        string
	Tests          []ControlTest
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// ControlTest represents a testing record for a control
type ControlTest struct {
	ID         uuid.UUID
	ControlID  uuid.UUID
	TestDate   string
	Tester     string
	Result     string
	Deficiency string
	CreatedAt  time.Time
}

// Validate performs domain validation on Control
func (c *Control) Validate() error {
	if c.Code == "" {
		return errors.ErrInvalidCode
	}
	if c.Name == "" {
		return errors.ErrInvalidName
	}
	if c.Type == "" {
		return errors.ErrInvalidControlType
	}
	return nil
}

// IsEffective checks if control is effective
func (c *Control) IsEffective() bool {
	return c.Effectiveness == "effective" || c.Effectiveness == "adequate"
}
