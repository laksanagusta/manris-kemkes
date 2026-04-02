package meeting_minute

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/repository"
)

type DeleteMeetingMinuteUseCase struct {
	mmRepo repository.MeetingMinuteRepository
}

func NewDeleteMeetingMinuteUseCase(mmRepo repository.MeetingMinuteRepository) *DeleteMeetingMinuteUseCase {
	return &DeleteMeetingMinuteUseCase{mmRepo: mmRepo}
}

type DeleteInput struct {
	ID uuid.UUID
}

func (uc *DeleteMeetingMinuteUseCase) Execute(ctx context.Context, input DeleteInput) error {
	return uc.mmRepo.Delete(ctx, input.ID)
}
