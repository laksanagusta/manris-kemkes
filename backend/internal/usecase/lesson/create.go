package lesson

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// CreateLessonUseCase handles lesson creation business logic
type CreateLessonUseCase struct {
	lessonRepo repository.LessonRepository
	userRepo   repository.UserRepository
	orgRepo    repository.OrganizationRepository
}

func NewCreateLessonUseCase(
	lessonRepo repository.LessonRepository,
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
) *CreateLessonUseCase {
	return &CreateLessonUseCase{
		lessonRepo: lessonRepo,
		userRepo:   userRepo,
		orgRepo:    orgRepo,
	}
}

type CreateLessonInput struct {
	Title           string
	Description     string
	SourceType      string
	SourceRef       string
	SuccessFactors  string
	FailureFactors  string
	Recommendations string
	Tags            []string
	AuthorID        *uuid.UUID
	OrganizationID  *uuid.UUID
}

type CreateLessonOutput struct {
	ID        uuid.UUID
	Message   string
	CreatedAt time.Time
}

func (uc *CreateLessonUseCase) Execute(ctx context.Context, input CreateLessonInput) (*CreateLessonOutput, error) {
	// 1. Validate input
	if input.Title == "" {
		return nil, errors.ErrInvalidTitle
	}
	if input.Description == "" {
		return nil, errors.ErrInvalidDescription
	}
	if input.SourceType == "" {
		return nil, errors.ErrInvalidSourceType
	}
	if input.AuthorID == nil {
		return nil, errors.ErrInvalidInput
	}

	// 2. Validate author exists
	_, err := uc.userRepo.GetByID(ctx, *input.AuthorID)
	if err != nil {
		return nil, errors.Wrap(err, "author not found")
	}

	// 3. Validate organization if provided
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 4. Create lesson entity
	lesson := &entity.Lesson{
		Title:           input.Title,
		Description:     input.Description,
		SourceType:      input.SourceType,
		SourceRef:       input.SourceRef,
		SuccessFactors:  input.SuccessFactors,
		FailureFactors:  input.FailureFactors,
		Recommendations: input.Recommendations,
		Tags:            input.Tags,
		AuthorID:        input.AuthorID,
		OrganizationID:  input.OrganizationID,
	}

	// 5. Validate lesson entity
	if err := lesson.Validate(); err != nil {
		return nil, err
	}

	// 6. Save to database
	if err := uc.lessonRepo.Create(ctx, lesson); err != nil {
		return nil, errors.Wrap(err, "failed to create lesson")
	}

	// 7. Return result
	return &CreateLessonOutput{
		ID:        lesson.ID,
		Message:   "Lesson created successfully",
		CreatedAt: lesson.CreatedAt,
	}, nil
}
