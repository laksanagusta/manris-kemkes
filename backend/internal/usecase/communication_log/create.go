package communication_log

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// CreateCommunicationLogUseCase handles creating communication logs
type CreateCommunicationLogUseCase struct {
	commLogRepo repository.CommunicationLogRepository
	riskRepo    repository.RiskRepository
	userRepo    repository.UserRepository
}

// NewCreateCommunicationLogUseCase creates a new usecase
func NewCreateCommunicationLogUseCase(
	commLogRepo repository.CommunicationLogRepository,
	riskRepo repository.RiskRepository,
	userRepo repository.UserRepository,
) *CreateCommunicationLogUseCase {
	return &CreateCommunicationLogUseCase{
		commLogRepo: commLogRepo,
		riskRepo:    riskRepo,
		userRepo:    userRepo,
	}
}

// Input represents the input for creating a communication log
type CreateCommunicationLogInput struct {
	RiskID    string
	Notes     string
	CreatedBy string
	OrgIDs    []uuid.UUID
}

// Output represents the created communication log
type CreateCommunicationLogOutput struct {
	ID            string
	RiskID        string
	Notes         string
	CreatedBy     string
	CreatedByName string
	CreatedAt     string
}

// Execute creates a new communication log
func (uc *CreateCommunicationLogUseCase) Execute(ctx context.Context, input CreateCommunicationLogInput) (*CreateCommunicationLogOutput, error) {
	input.Notes = strings.TrimSpace(input.Notes)
	if input.Notes == "" {
		return nil, domainerrors.ErrInvalidInput
	}

	riskID, err := uuid.Parse(input.RiskID)
	if err != nil {
		return nil, domainerrors.ErrInvalidInput
	}

	createdBy, err := uuid.Parse(input.CreatedBy)
	if err != nil {
		return nil, domainerrors.ErrInvalidInput
	}

	// Validate risk exists
	_, err = uc.riskRepo.GetByID(ctx, riskID, input.OrgIDs)
	if err != nil {
		return nil, domainerrors.ErrRiskNotFound
	}

	// Get user name
	user, err := uc.userRepo.GetByID(ctx, createdBy)
	if err != nil {
		return nil, domainerrors.ErrNotFound
	}

	commLog := &entity.CommunicationLog{
		RiskID:    riskID,
		Notes:     input.Notes,
		CreatedBy: createdBy,
	}

	if err := uc.commLogRepo.Create(ctx, commLog); err != nil {
		return nil, err
	}

	return &CreateCommunicationLogOutput{
		ID:            commLog.ID.String(),
		RiskID:        commLog.RiskID.String(),
		Notes:         commLog.Notes,
		CreatedBy:     commLog.CreatedBy.String(),
		CreatedByName: user.Name,
		CreatedAt:     commLog.CreatedAt.Format(time.RFC3339),
	}, nil
}
