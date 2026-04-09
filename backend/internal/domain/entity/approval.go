package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// ApprovalRequest represents an approval request for risks/incidents.
// This is a domain entity that contains business logic.
type ApprovalRequest struct {
	ID                    uuid.UUID
	RequestType           string // 'risk' or 'incident'
	EntityID              uuid.UUID
	RequestedBy           uuid.UUID
	RequestedByName       string
	RequestedAt           time.Time
	CurrentStatus         string // 'pending', 'approved', 'rejected'
	CurrentApproverRole   string // 'reviewer' or 'pimpinan'
	CurrentApproverUserID *uuid.UUID
	Notes                 string
	CreatedAt             time.Time
	UpdatedAt             time.Time

	// Joined data for display (not part of core domain)
	EntityCode          *string
	EntityTitle         *string
	EntityOrgID         *uuid.UUID
	EntityOrgName       *string
	CurrentApproverName *string
	History             []ApprovalHistory
	Steps               []ApprovalStep
}

type ApprovalStep struct {
	ID                uuid.UUID
	ApprovalRequestID uuid.UUID
	SequenceNo        int
	ApproverUserID    uuid.UUID
	ApproverName      string
	ApproverRole      string
	StepType          string // 'review' or 'approval' - distinguishes reviewer stage from approver stage
	Status            string
	ActedAt           *time.Time
	Comments          string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// ApprovalHistory represents the audit trail for approval workflow.
type ApprovalHistory struct {
	ID                uuid.UUID
	ApprovalRequestID uuid.UUID
	Action            string // 'submitted', 'approved', 'rejected', 'returned'
	ActorID           uuid.UUID
	ActorName         string
	ActorRole         string
	Comments          string
	CreatedAt         time.Time
}

// Validate performs domain validation on ApprovalRequest
func (a *ApprovalRequest) Validate() error {
	if a.RequestType == "" {
		return errors.ErrInvalidRequestType
	}
	if a.RequestType != "risk" && a.RequestType != "incident" {
		return errors.ErrInvalidRequestType
	}
	if a.CurrentStatus == "" {
		return errors.ErrInvalidStatus
	}
	if a.CurrentApproverRole == "" {
		return errors.ErrInvalidApproverRole
	}
	return nil
}

// CanBeApproved checks if the request can be approved
func (a *ApprovalRequest) CanBeApproved() bool {
	return a.CurrentStatus == "pending"
}

// CanBeRejected checks if the request can be rejected
func (a *ApprovalRequest) CanBeRejected() bool {
	return a.CurrentStatus == "pending"
}

// IsPending checks if the request is still pending
func (a *ApprovalRequest) IsPending() bool {
	return a.CurrentStatus == "pending"
}

// IsApproved checks if the request has been approved
func (a *ApprovalRequest) IsApproved() bool {
	return a.CurrentStatus == "approved"
}

// IsRejected checks if the request has been rejected
func (a *ApprovalRequest) IsRejected() bool {
	return a.CurrentStatus == "rejected"
}
