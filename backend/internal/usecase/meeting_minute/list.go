package meeting_minute

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type ListMeetingMinutesUseCase struct {
	mmRepo repository.MeetingMinuteRepository
}

func NewListMeetingMinutesUseCase(mmRepo repository.MeetingMinuteRepository) *ListMeetingMinutesUseCase {
	return &ListMeetingMinutesUseCase{mmRepo: mmRepo}
}

type ListInput struct {
	OrgIDs    []uuid.UUID
	CreatedBy *uuid.UUID
	RiskID    *uuid.UUID
	CreatedAt string
	Limit     int
	Offset    int
}

type ListOutput struct {
	Items []entity.MeetingMinute `json:"items"`
	Total int                    `json:"total"`
}

func (uc *ListMeetingMinutesUseCase) Execute(ctx context.Context, input ListInput) (*ListOutput, error) {
	items, total, err := uc.mmRepo.List(ctx, repository.ListMeetingMinutesOptions{
		OrgIDs:    input.OrgIDs,
		CreatedBy: input.CreatedBy,
		RiskID:    input.RiskID,
		CreatedAt: input.CreatedAt,
		Limit:     input.Limit,
		Offset:    input.Offset,
	})
	if err != nil {
		return nil, err
	}

	return &ListOutput{
		Items: items,
		Total: total,
	}, nil
}
