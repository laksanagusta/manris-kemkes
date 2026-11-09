package communication_log

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"testing"
	"time"
)

type noteRepo struct {
	repository.CommunicationLogRepository
	saved *entity.CommunicationLog
	err   error
}

func (r *noteRepo) Create(_ context.Context, log *entity.CommunicationLog) error {
	if r.err != nil {
		return r.err
	}
	log.ID = uuid.New()
	log.CreatedAt = time.Date(2026, 11, 3, 0, 0, 0, 0, time.UTC)
	r.saved = log
	return nil
}

type riskRepo struct {
	repository.RiskRepository
	err error
}

func (r riskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	return &entity.Risk{}, r.err
}

type userRepo struct{ repository.UserRepository }

func (userRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.User, error) {
	return &entity.User{ID: id, Name: "Test author"}, nil
}

func TestCreateNoteWithoutStakeholder(t *testing.T) {
	for _, tc := range []struct {
		name, note string
		invalid    bool
	}{
		{"valid", " Follow up ", false}, {"blank note", " \n ", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			repo := &noteRepo{}
			uc := NewCreateCommunicationLogUseCase(repo, riskRepo{}, userRepo{})
			out, err := uc.Execute(context.Background(), CreateCommunicationLogInput{RiskID: uuid.NewString(), CreatedBy: uuid.NewString(), Notes: tc.note})
			if tc.invalid {
				if !errors.Is(err, domainerrors.ErrInvalidInput) || repo.saved != nil {
					t.Fatalf("invalid input saved: %v", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if out.Notes != "Follow up" || out.CreatedAt == "" || out.CreatedByName != "Test author" {
				t.Fatalf("unexpected output: %#v", out)
			}
		})
	}
}
func TestCreateRejectsInaccessibleRisk(t *testing.T) {
	repo := &noteRepo{}
	uc := NewCreateCommunicationLogUseCase(repo, riskRepo{err: errors.New("outside scope")}, userRepo{})
	_, err := uc.Execute(context.Background(), CreateCommunicationLogInput{RiskID: uuid.NewString(), CreatedBy: uuid.NewString(), Notes: "note"})
	if !errors.Is(err, domainerrors.ErrRiskNotFound) || repo.saved != nil {
		t.Fatalf("inaccessible risk saved: %v", err)
	}
}
func TestCreatePropagatesSaveFailure(t *testing.T) {
	want := errors.New("save failed")
	uc := NewCreateCommunicationLogUseCase(&noteRepo{err: want}, riskRepo{}, userRepo{})
	_, err := uc.Execute(context.Background(), CreateCommunicationLogInput{RiskID: uuid.NewString(), CreatedBy: uuid.NewString(), Notes: "note"})
	if !errors.Is(err, want) {
		t.Fatalf("error: %v", err)
	}
}
