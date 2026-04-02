package communication_log

import (
	"context"
	"time"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// ListCommunicationLogsUseCase handles listing communication logs
type ListCommunicationLogsUseCase struct {
	commLogRepo repository.CommunicationLogRepository
}

// NewListCommunicationLogsUseCase creates a new usecase
func NewListCommunicationLogsUseCase(commLogRepo repository.CommunicationLogRepository) *ListCommunicationLogsUseCase {
	return &ListCommunicationLogsUseCase{
		commLogRepo: commLogRepo,
	}
}

// Input represents the input for listing communication logs
type ListCommunicationLogsInput struct {
	RiskID string
}

// Output represents a single communication log in the list
type ListCommunicationLogOutput struct {
	ID            string
	RiskID        string
	Date          string
	Method        string
	Stakeholder   string
	Notes         string
	CreatedBy     string
	CreatedByName string
	CreatedAt     string
}

// Execute lists all communication logs for a risk
func (uc *ListCommunicationLogsUseCase) Execute(ctx context.Context, input ListCommunicationLogsInput) ([]ListCommunicationLogOutput, error) {
	riskID, err := uuid.Parse(input.RiskID)
	if err != nil {
		return nil, domainerrors.ErrInvalidInput
	}

	logs, err := uc.commLogRepo.ListByRiskID(ctx, riskID)
	if err != nil {
		return nil, err
	}

	result := make([]ListCommunicationLogOutput, len(logs))
	for i, log := range logs {
		result[i] = ListCommunicationLogOutput{
			ID:            log.ID.String(),
			RiskID:        log.RiskID.String(),
			Date:          log.Date.Format("2006-01-02"),
			Method:        log.Method,
			Stakeholder:   log.Stakeholder,
			Notes:         log.Notes,
			CreatedBy:     log.CreatedBy.String(),
			CreatedByName: log.CreatedByName,
			CreatedAt:     log.CreatedAt.Format(time.RFC3339),
		}
	}

	return result, nil
}
