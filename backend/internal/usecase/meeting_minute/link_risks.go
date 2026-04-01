package meeting_minute

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/repository"
)

type LinkRisksUseCase struct {
	mmRepo repository.MeetingMinuteRepository
}

func NewLinkRisksUseCase(mmRepo repository.MeetingMinuteRepository) *LinkRisksUseCase {
	return &LinkRisksUseCase{mmRepo: mmRepo}
}

type LinkRisksInput struct {
	MeetingID uuid.UUID
	RiskIDs   []uuid.UUID
	LinkedBy  uuid.UUID
}

func (uc *LinkRisksUseCase) Execute(ctx context.Context, input LinkRisksInput) error {
	return uc.mmRepo.LinkRisks(ctx, input.MeetingID, input.RiskIDs, input.LinkedBy)
}

type UnlinkRisksInput struct {
	MeetingID uuid.UUID
	RiskIDs   []uuid.UUID
}

func (uc *LinkRisksUseCase) Unlink(ctx context.Context, input UnlinkRisksInput) error {
	return uc.mmRepo.UnlinkRisks(ctx, input.MeetingID, input.RiskIDs)
}
