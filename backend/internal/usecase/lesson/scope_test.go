package lesson

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
)

type scopeLessonRepo struct {
	item *entity.Lesson
}

func (r *scopeLessonRepo) Create(_ context.Context, _ *entity.Lesson) error { return nil }
func (r *scopeLessonRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Lesson, error) {
	if r.item == nil {
		return nil, fmt.Errorf("not found")
	}
	if orgIDs != nil {
		found := false
		for _, oid := range orgIDs {
			if r.item.OrganizationID != nil && oid == *r.item.OrganizationID {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("not found")
		}
	}
	copy := *r.item
	return &copy, nil
}
func (r *scopeLessonRepo) Update(_ context.Context, _ *entity.Lesson) error { return nil }
func (r *scopeLessonRepo) Delete(_ context.Context, _ uuid.UUID) error      { return nil }
func (r *scopeLessonRepo) List(_ context.Context, _ []uuid.UUID) ([]*entity.Lesson, error) {
	return nil, nil
}
func (r *scopeLessonRepo) GetDashboard(_ context.Context, _ []uuid.UUID) (map[string]interface{}, error) {
	return nil, nil
}

type scopeLessonUserRepo struct{}

func (r *scopeLessonUserRepo) Create(context.Context, *entity.User) error { return nil }
func (r *scopeLessonUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	return &entity.User{}, nil
}
func (r *scopeLessonUserRepo) GetByUsername(_ context.Context, _ string) (*entity.User, error) {
	return &entity.User{}, nil
}
func (r *scopeLessonUserRepo) Update(context.Context, *entity.User) error { return nil }
func (r *scopeLessonUserRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *scopeLessonUserRepo) List(context.Context) ([]*entity.User, error) {
	return nil, nil
}

type scopeLessonOrgRepo struct{}

func (r *scopeLessonOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *scopeLessonOrgRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: uuid.New(), Name: "org"}, nil
}
func (r *scopeLessonOrgRepo) Update(context.Context, *entity.Organization) error { return nil }
func (r *scopeLessonOrgRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *scopeLessonOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (r *scopeLessonOrgRepo) GetDescendants(_ context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{id}, nil
}

func TestGetLessonScopedAllowsAccessibleOrg(t *testing.T) {
	orgID := uuid.New()
	lessonID := uuid.New()

	repo := &scopeLessonRepo{item: &entity.Lesson{
		ID:             lessonID,
		Title:          "Test Lesson",
		Description:    "desc",
		SourceType:     "incident",
		OrganizationID: &orgID,
	}}

	uc := NewGetLessonUseCase(repo)
	result, err := uc.Execute(context.Background(), lessonID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("expected access allowed, got %v", err)
	}
	if result.ID != lessonID {
		t.Fatalf("expected lesson %s, got %s", lessonID, result.ID)
	}
}

func TestGetLessonScopedReturnsNotFoundForSiblingOrg(t *testing.T) {
	orgID := uuid.New()
	siblingOrg := uuid.New()
	lessonID := uuid.New()

	repo := &scopeLessonRepo{item: &entity.Lesson{
		ID:             lessonID,
		Title:          "Test Lesson",
		Description:    "desc",
		SourceType:     "incident",
		OrganizationID: &orgID,
	}}

	uc := NewGetLessonUseCase(repo)
	_, err := uc.Execute(context.Background(), lessonID, []uuid.UUID{siblingOrg})
	if err == nil {
		t.Fatal("expected not-found error for sibling org, got nil")
	}
}

func TestUpdateLessonParentCannotUpdateChildOwned(t *testing.T) {
	childOrg := uuid.New()
	parentOrg := uuid.New()
	lessonID := uuid.New()

	repo := &scopeLessonRepo{item: &entity.Lesson{
		ID:             lessonID,
		Title:          "Test Lesson",
		Description:    "desc",
		SourceType:     "incident",
		SourceRef:      "INC-001",
		OrganizationID: &childOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	uc := NewUpdateLessonUseCase(repo, &scopeLessonUserRepo{}, &scopeLessonOrgRepo{})
	_, err := uc.Execute(context.Background(), UpdateLessonInput{
		ID:              lessonID,
		Title:           "Updated Lesson",
		Description:     "updated desc",
		SourceType:      "incident",
		SourceRef:       "INC-001",
		SuccessFactors:  "factor",
		FailureFactors:  "factor",
		Recommendations: "rec",
		Tags:            []string{"tag1"},
		OrganizationID:  &childOrg,
	}, scope.AccessibleOrgIDs, scope)
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestDeleteLessonParentCannotDeleteChildOwned(t *testing.T) {
	childOrg := uuid.New()
	parentOrg := uuid.New()
	lessonID := uuid.New()

	repo := &scopeLessonRepo{item: &entity.Lesson{
		ID:             lessonID,
		Title:          "Test Lesson",
		Description:    "desc",
		SourceType:     "incident",
		OrganizationID: &childOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	uc := NewDeleteLessonUseCase(repo)
	_, err := uc.Execute(context.Background(), lessonID, scope.AccessibleOrgIDs, scope)
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}
