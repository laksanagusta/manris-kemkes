package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type MeetingMinuteRepository interface {
	Create(ctx context.Context, input entity.CreateMeetingMinuteInput) (*entity.MeetingMinute, error)
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.MeetingMinuteWithRisks, error)
	List(ctx context.Context, opts ListMeetingMinutesOptions) ([]entity.MeetingMinute, int, error)
	Delete(ctx context.Context, id uuid.UUID) error
	ListByRiskID(ctx context.Context, riskID uuid.UUID) ([]entity.MeetingMinutesRisk, error)
	LinkRisks(ctx context.Context, meetingID uuid.UUID, riskIDs []uuid.UUID, linkedBy uuid.UUID) error
	UnlinkRisks(ctx context.Context, meetingID uuid.UUID, riskIDs []uuid.UUID) error
}

type ListMeetingMinutesOptions struct {
	OrgIDs    []uuid.UUID
	CreatedBy *uuid.UUID
	RiskID    *uuid.UUID
	CreatedAt string
	Limit     int
	Offset    int
}
