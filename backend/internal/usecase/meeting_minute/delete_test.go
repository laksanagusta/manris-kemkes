package meeting_minute

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type fakeDeleteMeetingMinuteRepo struct {
	deletedID uuid.UUID
	err       error
}

func (r *fakeDeleteMeetingMinuteRepo) Create(context.Context, entity.CreateMeetingMinuteInput) (*entity.MeetingMinute, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeDeleteMeetingMinuteRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.MeetingMinuteWithRisks, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeDeleteMeetingMinuteRepo) List(context.Context, repository.ListMeetingMinutesOptions) ([]entity.MeetingMinute, int, error) {
	return nil, 0, errors.New("not implemented")
}

func (r *fakeDeleteMeetingMinuteRepo) Delete(_ context.Context, id uuid.UUID) error {
	r.deletedID = id
	return r.err
}

func (r *fakeDeleteMeetingMinuteRepo) ListByRiskID(context.Context, uuid.UUID) ([]entity.MeetingMinutesRisk, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeDeleteMeetingMinuteRepo) LinkRisks(context.Context, uuid.UUID, []uuid.UUID, uuid.UUID) error {
	return errors.New("not implemented")
}

func (r *fakeDeleteMeetingMinuteRepo) UnlinkRisks(context.Context, uuid.UUID, []uuid.UUID) error {
	return errors.New("not implemented")
}

func TestDeleteMeetingMinuteUseCase_ExecuteDeletesMeetingMinute(t *testing.T) {
	repo := &fakeDeleteMeetingMinuteRepo{}
	uc := NewDeleteMeetingMinuteUseCase(repo)
	id := uuid.New()

	if err := uc.Execute(context.Background(), DeleteInput{ID: id}); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if repo.deletedID != id {
		t.Fatalf("expected deleted id %s, got %s", id, repo.deletedID)
	}
}
