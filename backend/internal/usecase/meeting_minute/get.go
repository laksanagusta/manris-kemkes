package meeting_minute

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type GetMeetingMinuteUseCase struct {
	mmRepo repository.MeetingMinuteRepository
}

func NewGetMeetingMinuteUseCase(mmRepo repository.MeetingMinuteRepository) *GetMeetingMinuteUseCase {
	return &GetMeetingMinuteUseCase{mmRepo: mmRepo}
}

type GetInput struct {
	ID uuid.UUID
}

func (uc *GetMeetingMinuteUseCase) Execute(ctx context.Context, input GetInput, orgIDs []uuid.UUID) (*entity.MeetingMinuteWithRisks, error) {
	return uc.mmRepo.GetByID(ctx, input.ID, orgIDs)
}
