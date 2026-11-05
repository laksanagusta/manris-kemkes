package risk

import (
	"context"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"testing"
)

type registerSortRepo struct {
	repository.RiskRepository
	filter repository.RiskRegisterFilter
}

func (r *registerSortRepo) ListRegister(_ context.Context, filter repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	r.filter = filter
	return nil, 0, nil
}
func TestRegisterDefaultSortBeforeRepositoryPagination(t *testing.T) {
	for _, tc := range []struct{ name, key, direction, wantKey, wantDirection string }{
		{"default", "", "", "created_at", "desc"},
		{"explicit score", "nilai", "asc", "nilai", "asc"},
		{"explicit creation ascending", "created_at", "asc", "created_at", "asc"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			repo := &registerSortRepo{}
			_, err := NewListRiskRegisterUseCase(repo).Execute(t.Context(), ListRiskRegisterInput{Page: 2, Limit: 10, SortBy: tc.key, SortOrder: tc.direction})
			if err != nil {
				t.Fatal(err)
			}
			if repo.filter.SortBy != tc.wantKey || repo.filter.SortOrder != tc.wantDirection || repo.filter.Page != 2 {
				t.Fatalf("unexpected paginated repository sort: %+v", repo.filter)
			}
		})
	}
}
