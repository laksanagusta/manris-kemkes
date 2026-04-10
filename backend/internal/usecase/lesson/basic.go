package lesson

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

// GetLessonUseCase retrieves a single lesson by ID
type GetLessonUseCase struct {
	lessonRepo repository.LessonRepository
}

func NewGetLessonUseCase(lessonRepo repository.LessonRepository) *GetLessonUseCase {
	return &GetLessonUseCase{
		lessonRepo: lessonRepo,
	}
}

func (uc *GetLessonUseCase) Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Lesson, error) {
	lesson, err := uc.lessonRepo.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	return lesson, nil
}

// ListLessonsUseCase retrieves lessons with optional filters
type ListLessonsUseCase struct {
	lessonRepo repository.LessonRepository
}

func NewListLessonsUseCase(lessonRepo repository.LessonRepository, orgSvc *service.OrganizationHierarchy) *ListLessonsUseCase {
	return &ListLessonsUseCase{
		lessonRepo: lessonRepo,
	}
}

type ListLessonsInput struct {
	OrgIDs []uuid.UUID
}

func (uc *ListLessonsUseCase) Execute(ctx context.Context, input ListLessonsInput) ([]*entity.Lesson, error) {
	lessons, err := uc.lessonRepo.List(ctx, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return lessons, nil
}

// UpdateLessonUseCase handles lesson update business logic
type UpdateLessonUseCase struct {
	lessonRepo repository.LessonRepository
	userRepo   repository.UserRepository
	orgRepo    repository.OrganizationRepository
}

func NewUpdateLessonUseCase(
	lessonRepo repository.LessonRepository,
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
) *UpdateLessonUseCase {
	return &UpdateLessonUseCase{
		lessonRepo: lessonRepo,
		userRepo:   userRepo,
		orgRepo:    orgRepo,
	}
}

type UpdateLessonInput struct {
	ID              uuid.UUID
	Title           string
	Description     string
	SourceType      string
	SourceRef       string
	SuccessFactors  string
	FailureFactors  string
	Recommendations string
	Tags            []string
	OrganizationID  *uuid.UUID
}

type UpdateLessonOutput struct {
	ID        uuid.UUID
	Message   string
	UpdatedAt time.Time
}

func (uc *UpdateLessonUseCase) Execute(ctx context.Context, input UpdateLessonInput, orgIDs []uuid.UUID, scope *entity.AccessScope) (*UpdateLessonOutput, error) {
	// 1. Get existing lesson
	existingLesson, err := uc.lessonRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	if scope != nil && existingLesson.OrganizationID != nil && !scope.CanWrite(*existingLesson.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	// 2. Validate organization if changed
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 3. Update lesson entity (cannot change author)
	existingLesson.Title = input.Title
	existingLesson.Description = input.Description
	existingLesson.SourceType = input.SourceType
	existingLesson.SourceRef = input.SourceRef
	existingLesson.SuccessFactors = input.SuccessFactors
	existingLesson.FailureFactors = input.FailureFactors
	existingLesson.Recommendations = input.Recommendations
	existingLesson.Tags = input.Tags
	existingLesson.OrganizationID = input.OrganizationID

	// 4. Validate lesson entity
	if err := existingLesson.Validate(); err != nil {
		return nil, err
	}

	// 5. Save to database
	if err := uc.lessonRepo.Update(ctx, existingLesson); err != nil {
		return nil, errors.Wrap(err, "failed to update lesson")
	}

	// 6. Return result
	return &UpdateLessonOutput{
		ID:        existingLesson.ID,
		Message:   "Lesson updated successfully",
		UpdatedAt: existingLesson.CreatedAt, // Lesson entity only has CreatedAt
	}, nil
}

// DeleteLessonUseCase handles lesson deletion business logic
type DeleteLessonUseCase struct {
	lessonRepo repository.LessonRepository
}

func NewDeleteLessonUseCase(lessonRepo repository.LessonRepository) *DeleteLessonUseCase {
	return &DeleteLessonUseCase{
		lessonRepo: lessonRepo,
	}
}

type DeleteLessonOutput struct {
	Message string
}

func (uc *DeleteLessonUseCase) Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID, scope *entity.AccessScope) (*DeleteLessonOutput, error) {
	// 1. Get existing lesson to check if it exists
	lesson, err := uc.lessonRepo.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	if scope != nil && lesson.OrganizationID != nil && !scope.CanWrite(*lesson.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	// 2. Delete from database
	if err := uc.lessonRepo.Delete(ctx, id); err != nil {
		return nil, err
	}

	return &DeleteLessonOutput{
		Message: "Lesson deleted successfully",
	}, nil
}

// LessonDashboardUseCase retrieves dashboard metrics for lessons
type LessonDashboardUseCase struct {
	lessonRepo repository.LessonRepository
}

func NewLessonDashboardUseCase(lessonRepo repository.LessonRepository, orgSvc *service.OrganizationHierarchy) *LessonDashboardUseCase {
	return &LessonDashboardUseCase{
		lessonRepo: lessonRepo,
	}
}

type LessonDashboardInput struct {
	OrgIDs []uuid.UUID
}

func (uc *LessonDashboardUseCase) Execute(ctx context.Context, input LessonDashboardInput) (map[string]interface{}, error) {
	metrics, err := uc.lessonRepo.GetDashboard(ctx, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return metrics, nil
}
