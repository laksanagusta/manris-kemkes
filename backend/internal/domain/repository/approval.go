package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// ApprovalRepository defines the interface for approval data access.
// This interface belongs to the domain layer - implementation is in infrastructure layer.
type ApprovalRepository interface {
	// List retrieves approval requests with optional filters
	List(ctx context.Context, status string, approverRole string, approverUserID *uuid.UUID, orgIDs []uuid.UUID) ([]*entity.ApprovalRequest, error)

	// FindByID retrieves a single approval request by ID
	FindByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.ApprovalRequest, error)

	// FindByEntity retrieves an approval request by entity type and ID
	FindByEntity(ctx context.Context, requestType string, entityID uuid.UUID, orgIDs []uuid.UUID) (*entity.ApprovalRequest, error)
	GetHistoryByEntity(ctx context.Context, requestType string, entityID uuid.UUID) ([]*entity.ApprovalHistory, error)

	// Create inserts a new approval request
	Create(ctx context.Context, req *entity.ApprovalRequest) error
	CreateSteps(ctx context.Context, approvalRequestID uuid.UUID, steps []entity.ApprovalStep) error

	// UpdateStatus updates the status of an approval request
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error

	// AddHistory adds a history entry to an approval request
	AddHistory(ctx context.Context, hist *entity.ApprovalHistory) error

	// GetHistory retrieves all history entries for an approval request
	GetHistory(ctx context.Context, approvalRequestID uuid.UUID) ([]*entity.ApprovalHistory, error)
	GetSteps(ctx context.Context, approvalRequestID uuid.UUID) ([]*entity.ApprovalStep, error)
	ApproveCurrentStep(ctx context.Context, approvalRequestID uuid.UUID, actorID uuid.UUID, comments string) (*entity.ApprovalStep, *entity.ApprovalStep, error)
	RejectCurrentStep(ctx context.Context, approvalRequestID uuid.UUID, actorID uuid.UUID, comments string) error

	// GetPendingCount returns the count of pending approval requests for a user/role filter
	GetPendingCount(ctx context.Context, approverRole string, approverUserID *uuid.UUID, orgIDs []uuid.UUID) (int, error)
}
