package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// WorkingPaperRepository defines the interface for working paper data access.
// This interface belongs to the domain layer - implementation is in infrastructure layer.
type WorkingPaperRepository interface {
	Create(ctx context.Context, wp *entity.WorkingPaper) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.WorkingPaper, error)
	List(ctx context.Context, orgIDs []uuid.UUID, status, query, assessmentCycle, createdAt string, page, limit int) ([]*entity.WorkingPaper, int, error)
	Update(ctx context.Context, wp *entity.WorkingPaper) error
	Delete(ctx context.Context, id uuid.UUID) error
	MutateByIDForUpdate(ctx context.Context, id uuid.UUID, mutate func(*entity.WorkingPaper) error) (*entity.WorkingPaper, error)

	// GetSignatoriesByWorkingPaperID retrieves all signatories for a working paper
	GetSignatoriesByWorkingPaperID(ctx context.Context, wpID uuid.UUID) ([]*entity.WorkingPaperSignatory, error)
	UpdateSignatory(ctx context.Context, sig *entity.WorkingPaperSignatory) error

	// GetPendingSigningByUserID retrieves working papers pending this user's signature
	GetPendingSigningByUserID(ctx context.Context, userID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.WorkingPaper, error)
	CountPendingSigningByUserID(ctx context.Context, userID uuid.UUID) (int, error)
	HasBlockingDocumentLink(ctx context.Context, riskID uuid.UUID) (bool, error)
	CountByOrgAndCycle(ctx context.Context, orgID uuid.UUID, cycle string) (int, error)
}
