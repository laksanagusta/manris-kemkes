package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// CommunicationLogRepository defines the interface for communication log data access.
type CommunicationLogRepository interface {
	// Create inserts a new communication log
	Create(ctx context.Context, log *entity.CommunicationLog) error

	// ListByRiskID retrieves all communication logs for a risk
	ListByRiskID(ctx context.Context, riskID uuid.UUID) ([]*entity.CommunicationLog, error)

	// Delete removes a communication log
	Delete(ctx context.Context, id uuid.UUID) error

	// FindByID retrieves a single communication log by ID
	FindByID(ctx context.Context, id uuid.UUID) (*entity.CommunicationLog, error)
}
