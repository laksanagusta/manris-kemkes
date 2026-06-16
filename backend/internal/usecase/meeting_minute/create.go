package meeting_minute

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateMeetingMinuteUseCase struct {
	mmRepo   repository.MeetingMinuteRepository
	userRepo repository.UserRepository
}

func NewCreateMeetingMinuteUseCase(
	mmRepo repository.MeetingMinuteRepository,
	userRepo repository.UserRepository,
) *CreateMeetingMinuteUseCase {
	return &CreateMeetingMinuteUseCase{mmRepo: mmRepo, userRepo: userRepo}
}

type CreateInput struct {
	Title          string
	Date           string
	Participants   []string
	Agenda         []string
	Summary        string
	KeyPoints      []string
	Decisions      []string
	OpenIssues     []string
	ActionItems    []entity.ActionItem
	NextCheckIn    *string
	Transcript     string
	OrganizationID *uuid.UUID
	CreatedBy      uuid.UUID
	RiskIDs        []uuid.UUID
}

type CreateOutput struct {
	ID            uuid.UUID   `json:"id"`
	Title         string      `json:"title"`
	Date          string      `json:"date"`
	LinkedRiskIDs []uuid.UUID `json:"linkedRiskIds"`
}

func (uc *CreateMeetingMinuteUseCase) Execute(ctx context.Context, input CreateInput) (*CreateOutput, error) {
	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		return nil, fmt.Errorf("format tanggal tidak valid: %w", err)
	}

	var nextCheckIn *time.Time
	if input.NextCheckIn != nil {
		parsed, err := time.Parse("2006-01-02", *input.NextCheckIn)
		if err == nil {
			nextCheckIn = &parsed
		}
	}

	mm, err := uc.mmRepo.Create(ctx, entity.CreateMeetingMinuteInput{
		Title:          input.Title,
		Date:           date,
		Participants:   input.Participants,
		Agenda:         input.Agenda,
		Summary:        input.Summary,
		KeyPoints:      input.KeyPoints,
		Decisions:      input.Decisions,
		OpenIssues:     input.OpenIssues,
		ActionItems:    input.ActionItems,
		NextCheckIn:    nextCheckIn,
		Transcript:     input.Transcript,
		OrganizationID: input.OrganizationID,
		CreatedBy:      input.CreatedBy,
		RiskIDs:        input.RiskIDs,
	})
	if err != nil {
		return nil, err
	}

	return &CreateOutput{
		ID:            mm.ID,
		Title:         mm.Title,
		Date:          mm.Date.Format("2006-01-02"),
		LinkedRiskIDs: input.RiskIDs,
	}, nil
}
